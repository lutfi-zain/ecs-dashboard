export const runtime = "nodejs"
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server"
import { ListServicesCommand, DescribeServicesCommand, type ListServicesCommandOutput } from "@aws-sdk/client-ecs"
import { createECSClient } from "@/lib/aws-config"
import { servicesRateLimiter, getClientIdentifier, isAllowedCluster } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    // Rate limiting check
    const clientId = getClientIdentifier(request)
    const rateLimitResult = servicesRateLimiter.check(clientId)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: rateLimitResult.blockUntil
            ? `Too many requests. Blocked until ${new Date(rateLimitResult.blockUntil).toLocaleString()}`
            : `Rate limit exceeded. Try again after ${new Date(rateLimitResult.resetTime!).toLocaleString()}`,
          resetTime: rateLimitResult.resetTime,
          blockUntil: rateLimitResult.blockUntil,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.blockUntil 
              ? Math.ceil((rateLimitResult.blockUntil - Date.now()) / 1000).toString()
              : '60',
          }
        }
      )
    }

    const { clusterName } = await request.json()

    if (!clusterName) {
      return NextResponse.json(
        { error: "clusterName is required" },
        { status: 400 }
      )
    }

    // Validate cluster name (whitelist check)
    if (!isAllowedCluster(clusterName)) {
      return NextResponse.json(
        { error: "Invalid cluster name" },
        { status: 400 }
      )
    }

    const ecsClient = createECSClient()

    // Get all service ARNs
    const allServiceArns: string[] = []
    let nextToken: string | undefined = undefined

    let continueLoop = true
    while (continueLoop) {
      const servicesResponse: ListServicesCommandOutput = await ecsClient.send(
        new ListServicesCommand({
          cluster: clusterName,
          maxResults: 100,
          nextToken: nextToken,
        })
      )

      if (servicesResponse.serviceArns) {
        allServiceArns.push(...servicesResponse.serviceArns)
      }

      nextToken = servicesResponse.nextToken
      continueLoop = !!nextToken
    }

    if (allServiceArns.length === 0) {
      return NextResponse.json({
        clusterName,
        services: [],
      })
    }

    // Get service details in batches (max 10 per request)
    const batchSize = 10
    const allServices = []

    for (let i = 0; i < allServiceArns.length; i += batchSize) {
      const batch = allServiceArns.slice(i, i + batchSize)
      
      const serviceDetailsResponse = await ecsClient.send(
        new DescribeServicesCommand({
          cluster: clusterName,
          services: batch,
        })
      )

      if (serviceDetailsResponse.services) {
        allServices.push(...serviceDetailsResponse.services)
      }
    }

    // Map to simpler format
    const services = allServices.map((service) => ({
      name: service.serviceName || "Unknown",
      arn: service.serviceArn || "",
      status: service.status || "Unknown",
      runningCount: service.runningCount || 0,
      desiredCount: service.desiredCount || 0,
    }))

    // Sort by name
    services.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      clusterName,
      services,
    })
  } catch (error) {
    console.error("Error fetching ECS services:", error)

    let errorMessage = "Failed to fetch services"
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json(
      {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
