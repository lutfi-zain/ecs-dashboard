export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch"
import { createCloudWatchClient } from "@/lib/aws-config"

export async function POST(request: Request) {
  try {
    const { clusterName, serviceName } = await request.json()

    if (!clusterName || !serviceName) {
      return NextResponse.json(
        { error: "clusterName and serviceName are required" },
        { status: 400 }
      )
    }

    const cloudWatchClient = createCloudWatchClient()
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - 5 * 60 * 1000) // Last 5 minutes

    // Fetch CPU Utilization
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
      StartTime: startTime,
      EndTime: endTime,
      Period: 300, // 5 minutes
      Statistics: ["Average"],
    })

    // Fetch Memory Utilization
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
      StartTime: startTime,
      EndTime: endTime,
      Period: 300, // 5 minutes
      Statistics: ["Average"],
    })

    const [cpuResponse, memoryResponse] = await Promise.all([
      cloudWatchClient.send(cpuCommand),
      cloudWatchClient.send(memoryCommand),
    ])

    // Get the most recent datapoint
    const cpuDatapoint = cpuResponse.Datapoints?.[cpuResponse.Datapoints.length - 1]
    const memoryDatapoint = memoryResponse.Datapoints?.[memoryResponse.Datapoints.length - 1]

    return NextResponse.json({
      serviceName,
      clusterName,
      cpu: {
        value: cpuDatapoint?.Average?.toFixed(2) || null,
        unit: "Percent",
        timestamp: cpuDatapoint?.Timestamp?.toISOString() || null,
      },
      memory: {
        value: memoryDatapoint?.Average?.toFixed(2) || null,
        unit: "Percent",
        timestamp: memoryDatapoint?.Timestamp?.toISOString() || null,
      },
    })
  } catch (error) {
    console.error("Error fetching ECS metrics:", error)

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
