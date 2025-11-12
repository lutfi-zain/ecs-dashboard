export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { DescribeClustersCommand, ListServicesCommand, DescribeServicesCommand, DescribeTaskDefinitionCommand, ECSClient } from "@aws-sdk/client-ecs"
import { createECSClient } from "@/lib/aws-config"

// Rate limiting utility
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Exponential backoff retry function
async function retryWithBackoff<T>(
  fn: () => Promise<T>, 
  maxRetries: number = 3, 
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      if (error.name === 'ThrottlingException' && attempt < maxRetries) {
        const delayMs = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
        console.log(`Throttling detected, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`)
        await delay(delayMs)
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}

// Rate limiting semaphore
class RateLimiter {
  private readonly queue: Array<() => void> = []
  private running = 0
  private readonly maxConcurrent: number
  private readonly minDelay: number

  constructor(maxConcurrent: number = 3, minDelay: number = 100) {
    this.maxConcurrent = maxConcurrent
    this.minDelay = minDelay
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.running < this.maxConcurrent) {
        this.running++
        setTimeout(resolve, this.minDelay)
      } else {
        this.queue.push(resolve)
      }
    })
  }

  release(): void {
    this.running--
    if (this.queue.length > 0) {
      const next = this.queue.shift()
      if (next) {
        this.running++
        setTimeout(next, this.minDelay)
      }
    }
  }
}

const taskDefLimiter = new RateLimiter(3, 200) // Max 3 concurrent, 200ms delay

// Rate limited task definition fetcher
async function fetchTaskDefinitionWithRateLimit(
  ecsClient: ECSClient, 
  taskDefinition: string
): Promise<{ cpuSpec: string | null; memorySpec: string | null }> {
  await taskDefLimiter.acquire()
  
  try {
    return await retryWithBackoff(async () => {
      const taskDefResponse = await ecsClient.send(
        new DescribeTaskDefinitionCommand({
          taskDefinition,
        })
      )

      const taskDef = taskDefResponse.taskDefinition
      if (!taskDef) {
        return { cpuSpec: null, memorySpec: null }
      }

      // Get task-level CPU and memory (for Fargate)
      let cpuSpec = taskDef.cpu || null
      let memorySpec = taskDef.memory || null

      // If not set at task level, sum container-level specs (for EC2)
      if (!cpuSpec && taskDef.containerDefinitions) {
        const totalCpu = taskDef.containerDefinitions.reduce(
          (sum, container) => sum + (container.cpu || 0),
          0
        )
        cpuSpec = totalCpu > 0 ? totalCpu.toString() : null
      }

      if (!memorySpec && taskDef.containerDefinitions) {
        const totalMemory = taskDef.containerDefinitions.reduce(
          (sum, container) => sum + (container.memory || container.memoryReservation || 0),
          0
        )
        memorySpec = totalMemory > 0 ? totalMemory.toString() : null
      }

      return { cpuSpec, memorySpec }
    })
  } finally {
    taskDefLimiter.release()
  }
}

const clusterNames = ["kairos-pay-cluster-ecs-iac", "kairos-his-cluster-ecs-iac", "kairos-pas-cluster-ecs-iac", "kairos-fe-cluster-ecs-iac"]
interface ECSServiceInfo {
  serviceName: string;
  serviceArn: string;
  status: string;
  runningCount: number;
  pendingCount: number;
  desiredCount: number;
  taskDefinition: string;
  platformVersion?: string;
  createdAt?: string;
  cpuSpec: string | null;
  memorySpec: string | null;
  lastDeployment?: {
    status: string;
    createdAt: string;
    taskDefinition: string;
  };
}

export async function GET() {
  try {
    // Create ECS client with configured credentials
    const ecsClient = createECSClient()

    // Process clusters with controlled concurrency
    const clusterData = await Promise.all(
      clusterNames.map(async (clusterName, index) => {
        // Stagger cluster processing to avoid overwhelming AWS APIs
        if (index > 0) {
          await delay(index * 300)
        }
      
        try {
          // Get cluster information
          const clusterResponse = await retryWithBackoff(async () => 
            ecsClient.send(
              new DescribeClustersCommand({
                clusters: [clusterName],
                include: ["STATISTICS"],
              })
            )
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
          const servicesResponse = await retryWithBackoff(async () => 
            ecsClient.send(
              new ListServicesCommand({
                cluster: clusterName,
                maxResults: 100, // Maximum allowed per request
                nextToken: nextToken,
              })
            )
          )

          if (servicesResponse.serviceArns) {
            allServiceArns.push(...servicesResponse.serviceArns)
          }

          nextToken = servicesResponse.nextToken
        } while (nextToken)

        let services: ECSServiceInfo[] = []
        if (allServiceArns.length > 0) {
          // Process services in batches of 10 (DescribeServices limit)
          const batchSize = 10
          const serviceBatches = []

          for (let i = 0; i < allServiceArns.length; i += batchSize) {
            serviceBatches.push(allServiceArns.slice(i, i + batchSize))
          }

          // Process service batches sequentially with delays
          const allServiceDetails = []
          for (let batchIndex = 0; batchIndex < serviceBatches.length; batchIndex++) {
            const batch = serviceBatches[batchIndex]
            
            if (batchIndex > 0) {
              await delay(200) // Delay between batches
            }
            
            const serviceDetailsResponse = await retryWithBackoff(async () =>
              ecsClient.send(
                new DescribeServicesCommand({
                  cluster: clusterName,
                  services: batch,
                })
              )
            )
            allServiceDetails.push(serviceDetailsResponse.services || [])
          }

          // Flatten all service details
          const flattenedServices = allServiceDetails.flat()

          // Get task definition details for CPU and memory specs with rate limiting
          const servicesWithSpecs = await Promise.all(
            flattenedServices.map(async (service) => {
              let cpuSpec = null
              let memorySpec = null

              try {
                if (service.taskDefinition) {
                  const taskDefSpecs = await fetchTaskDefinitionWithRateLimit(
                    ecsClient, 
                    service.taskDefinition
                  )
                  cpuSpec = taskDefSpecs.cpuSpec
                  memorySpec = taskDefSpecs.memorySpec
                }
              } catch (error) {
                console.error(`Error fetching task definition for ${service.serviceName}:`, error)
              }

              return {
                serviceName: service.serviceName || "Unknown",
                serviceArn: service.serviceArn || "",
                status: service.status || "Unknown",
                runningCount: service.runningCount || 0,
                pendingCount: service.pendingCount || 0,
                desiredCount: service.desiredCount || 0,
                taskDefinition: service.taskDefinition?.split("/").pop() || "Unknown",
                platformVersion: service.platformVersion,
                createdAt: service.createdAt?.toISOString(),
                cpuSpec,
                memorySpec,
                lastDeployment: service.deployments?.[0]
                  ? {
                    status: service.deployments[0].status || "Unknown",
                    createdAt: service.deployments[0].createdAt?.toISOString() || new Date().toISOString(),
                    taskDefinition: service.deployments[0].taskDefinition?.split("/").pop() || "Unknown",
                  }
                  : undefined,
              }
            })
          )

          services = servicesWithSpecs
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
      })
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
