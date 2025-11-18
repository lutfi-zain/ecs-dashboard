export const runtime = "nodejs"
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server"
import { GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch"
import { createCloudWatchClient } from "@/lib/aws-config"
import { 
  metricsRateLimiter, 
  getClientIdentifier, 
  validateTimeRange, 
  validateInput,
  isAllowedCluster 
} from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    // Rate limiting check
    const clientId = getClientIdentifier(request)
    const rateLimitResult = metricsRateLimiter.check(clientId)

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

    const { clusterName, serviceName, startTime, endTime, metricType = "both" } = await request.json()

    if (!clusterName || !serviceName || !startTime || !endTime) {
      return NextResponse.json(
        { error: "clusterName, serviceName, startTime, and endTime are required" },
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

    // Validate service name
    const serviceValidation = validateInput(serviceName, 255)
    if (!serviceValidation.valid) {
      return NextResponse.json(
        { error: `Invalid service name: ${serviceValidation.error}` },
        { status: 400 }
      )
    }

    // Validate metric type
    if (!['cpu', 'memory', 'both'].includes(metricType)) {
      return NextResponse.json(
        { error: "Invalid metric type. Must be 'cpu', 'memory', or 'both'" },
        { status: 400 }
      )
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    // Validate time range
    const timeRangeValidation = validateTimeRange(start, end)
    if (!timeRangeValidation.valid) {
      return NextResponse.json(
        { error: timeRangeValidation.error },
        { status: 400 }
      )
    }

    // Calculate appropriate period based on time range
    const durationMs = end.getTime() - start.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)
    
    let period: number
    if (durationHours <= 1) {
      period = 60 // 1 minute for ranges up to 1 hour
    } else if (durationHours <= 6) {
      period = 300 // 5 minutes for ranges up to 6 hours
    } else if (durationHours <= 24) {
      period = 900 // 15 minutes for ranges up to 24 hours
    } else if (durationHours <= 168) {
      period = 3600 // 1 hour for ranges up to 7 days
    } else {
      period = 3600 // 1 hour for longer ranges
    }

    const cloudWatchClient = createCloudWatchClient()
    const results: any = {
      cpu: [],
      memory: [],
    }

    // Fetch CPU Utilization if requested
    if (metricType === "both" || metricType === "cpu") {
      const cpuCommand = new GetMetricStatisticsCommand({
        Namespace: "AWS/ECS",
        MetricName: "CPUUtilization",
        Dimensions: [
          {
            Name: "ServiceName",
            Value: serviceName,
          },
          {
            Name: "ClusterName",
            Value: clusterName,
          },
        ],
        StartTime: start,
        EndTime: end,
        Period: period,
        Statistics: ["Average"],
      })

      const cpuResponse = await cloudWatchClient.send(cpuCommand)
      
      results.cpu = (cpuResponse.Datapoints || [])
        .map((dp) => ({
          timestamp: dp.Timestamp?.toISOString() || "",
          value: dp.Average ? parseFloat(dp.Average.toFixed(2)) : 0,
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    }

    // Fetch Memory Utilization if requested
    if (metricType === "both" || metricType === "memory") {
      const memoryCommand = new GetMetricStatisticsCommand({
        Namespace: "AWS/ECS",
        MetricName: "MemoryUtilization",
        Dimensions: [
          {
            Name: "ServiceName",
            Value: serviceName,
          },
          {
            Name: "ClusterName",
            Value: clusterName,
          },
        ],
        StartTime: start,
        EndTime: end,
        Period: period,
        Statistics: ["Average"],
      })

      const memoryResponse = await cloudWatchClient.send(memoryCommand)
      
      results.memory = (memoryResponse.Datapoints || [])
        .map((dp) => ({
          timestamp: dp.Timestamp?.toISOString() || "",
          value: dp.Average ? parseFloat(dp.Average.toFixed(2)) : 0,
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    }

    return NextResponse.json({
      serviceName,
      clusterName,
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        period,
      },
      cpu: results.cpu,
      memory: results.memory,
    })
  } catch (error) {
    console.error("Error fetching ECS metrics range:", error)

    let errorMessage = "Failed to fetch metrics"
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
