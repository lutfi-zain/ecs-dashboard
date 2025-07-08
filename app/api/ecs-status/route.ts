export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { DescribeClustersCommand, ListServicesCommand, DescribeServicesCommand } from "@aws-sdk/client-ecs"
import { createECSClient } from "@/lib/aws-config"

const clusterNames = ["kairos-pay-cluster-ecs-iac", "kairos-his-cluster-ecs-iac", "kairos-pas-cluster-ecs-iac"]

export async function GET() {
  try {
    // Create ECS client with configured credentials
    const ecsClient = createECSClient()

    const clusterData = await Promise.all(
      clusterNames.map(async (clusterName) => {
        try {
          // Get cluster information
          const clusterResponse = await ecsClient.send(
            new DescribeClustersCommand({
              clusters: [clusterName],
              include: ["STATISTICS"],
            }),
          )

          const cluster = clusterResponse.clusters?.[0]
          if (!cluster) {
            return {
              clusterName,
              status: "not-found",
              activeServicesCount: 0,
              runningTasksCount: 0,
              pendingTasksCount: 0,
              services: [],
              error: `Cluster ${clusterName} not found in region ${process.env.AWS_REGION}`,
            }
          }

          // Get services in the cluster
          const allServiceArns: string[] = []
          let nextToken: string | undefined = undefined

          do {
            const servicesResponse = await ecsClient.send(
              new ListServicesCommand({
                cluster: clusterName,
                maxResults: 100, // Maximum allowed per request
                nextToken: nextToken,
              }),
            )

            if (servicesResponse.serviceArns) {
              allServiceArns.push(...servicesResponse.serviceArns)
            }

            nextToken = servicesResponse.nextToken
          } while (nextToken)

          let services = []
          if (allServiceArns.length > 0) {
            // Process services in batches of 10 (DescribeServices limit)
            const batchSize = 10
            const serviceBatches = []

            for (let i = 0; i < allServiceArns.length; i += batchSize) {
              serviceBatches.push(allServiceArns.slice(i, i + batchSize))
            }

            const allServiceDetails = await Promise.all(
              serviceBatches.map(async (batch) => {
                const serviceDetailsResponse = await ecsClient.send(
                  new DescribeServicesCommand({
                    cluster: clusterName,
                    services: batch,
                  }),
                )
                return serviceDetailsResponse.services || []
              }),
            )

            // Flatten all service details
            const flattenedServices = allServiceDetails.flat()

            services = flattenedServices.map((service) => ({
              serviceName: service.serviceName || "Unknown",
              serviceArn: service.serviceArn || "",
              status: service.status || "Unknown",
              runningCount: service.runningCount || 0,
              pendingCount: service.pendingCount || 0,
              desiredCount: service.desiredCount || 0,
              taskDefinition: service.taskDefinition?.split("/").pop() || "Unknown",
              platformVersion: service.platformVersion,
              createdAt: service.createdAt?.toISOString(),
              lastDeployment: service.deployments?.[0]
                ? {
                    status: service.deployments[0].status || "Unknown",
                    createdAt: service.deployments[0].createdAt?.toISOString() || new Date().toISOString(),
                    taskDefinition: service.deployments[0].taskDefinition?.split("/").pop() || "Unknown",
                  }
                : undefined,
            }))
          }

          return {
            clusterName,
            status: cluster.status || "Unknown",
            activeServicesCount: cluster.activeServicesCount || 0,
            runningTasksCount: cluster.runningTasksCount || 0,
            pendingTasksCount: cluster.pendingTasksCount || 0,
            services,
          }
        } catch (error) {
          console.error(`Error fetching data for cluster ${clusterName}:`, error)

          let errorMessage = "Unknown error"
          if (error instanceof Error) {
            // Handle specific AWS errors
            if (error.name === "ClusterNotFoundException") {
              errorMessage = `Cluster ${clusterName} not found`
            } else if (error.name === "AccessDeniedException") {
              errorMessage = "Access denied - check AWS credentials and permissions"
            } else if (error.name === "UnauthorizedOperation") {
              errorMessage = "Unauthorized - insufficient permissions"
            } else {
              errorMessage = error.message
            }
          }

          return {
            clusterName,
            status: "error",
            activeServicesCount: 0,
            runningTasksCount: 0,
            pendingTasksCount: 0,
            services: [],
            error: errorMessage,
          }
        }
      }),
    )

    return NextResponse.json(clusterData)
  } catch (error) {
    console.error("Error fetching ECS status:", error)

    let errorMessage = "Failed to fetch ECS status"
    if (error instanceof Error) {
      if (error.message.includes("Missing required AWS environment variables")) {
        errorMessage = "AWS credentials not configured properly"
      } else if (error.message.includes("The security token included in the request is invalid")) {
        errorMessage = "Invalid AWS credentials"
      } else if (error.message.includes("Unable to locate credentials")) {
        errorMessage = "AWS credentials not found"
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
