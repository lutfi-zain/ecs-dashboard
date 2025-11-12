export const runtime = "nodejs"
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"
import { UpdateServiceCommand } from "@aws-sdk/client-ecs"
import { createECSClient } from "@/lib/aws-config"

interface UpdateRequest {
  clusterName: string
  serviceNames: string[]
}

interface UpdateResult {
  serviceName: string
  success: boolean
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateRequest = await request.json()
    const { clusterName, serviceNames } = body

    if (!clusterName || !serviceNames || serviceNames.length === 0) {
      return NextResponse.json({ error: "Cluster name and service names are required" }, { status: 400 })
    }

    // Create ECS client with configured credentials
    const ecsClient = createECSClient()

    const results: UpdateResult[] = await Promise.all(
      serviceNames.map(async (serviceName) => {
        try {
          const command = new UpdateServiceCommand({
            cluster: clusterName,
            service: serviceName,
            forceNewDeployment: true,
          })

          const response = await ecsClient.send(command)

          return {
            serviceName,
            success: true,
            message: `Force deployment initiated successfully (Task Definition: ${response.service?.taskDefinition?.split("/").pop()})`,
          }
        } catch (error) {
          console.error(`Error updating service ${serviceName}:`, error)

          let errorMessage = "Unknown error occurred"
          if (error instanceof Error) {
            if (error.name === "ServiceNotFoundException") {
              errorMessage = "Service not found"
            } else if (error.name === "ClusterNotFoundException") {
              errorMessage = "Cluster not found"
            } else if (error.name === "AccessDeniedException") {
              errorMessage = "Access denied - insufficient permissions"
            } else if (error.name === "InvalidParameterException") {
              errorMessage = "Invalid parameters provided"
            } else {
              errorMessage = error.message
            }
          }

          return {
            serviceName,
            success: false,
            message: `Failed to initiate deployment: ${errorMessage}`,
          }
        }
      }),
    )

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error in force update API:", error)

    let errorMessage = "Failed to process force update request"
    if (error instanceof Error) {
      if (error.message.includes("Missing required AWS environment variables")) {
        errorMessage = "AWS credentials not configured properly"
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        region: process.env.AWS_REGION,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
