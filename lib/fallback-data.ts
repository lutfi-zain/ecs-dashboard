// Fallback data untuk case ketika API tidak tersedia saat build
export const FALLBACK_CLUSTER_DATA = [
  {
    clusterName: "kairos-pay-cluster-ecs-iac",
    status: "loading",
    activeServicesCount: 0,
    runningTasksCount: 0,
    pendingTasksCount: 0,
    services: [],
    error: "Loading cluster data..."
  },
  {
    clusterName: "kairos-his-cluster-ecs-iac",
    status: "loading",
    activeServicesCount: 0,
    runningTasksCount: 0,
    pendingTasksCount: 0,
    services: [],
    error: "Loading cluster data..."
  },
  {
    clusterName: "kairos-pas-cluster-ecs-iac",
    status: "loading",
    activeServicesCount: 0,
    runningTasksCount: 0,
    pendingTasksCount: 0,
    services: [],
    error: "Loading cluster data..."
  },
  {
    clusterName: "kairos-fe-cluster-ecs-iac",
    status: "loading",
    activeServicesCount: 0,
    runningTasksCount: 0,
    pendingTasksCount: 0,
    services: [],
    error: "Loading cluster data..."
  }
]

export const FALLBACK_AWS_HEALTH = {
  status: "checking",
  message: "Checking AWS connection...",
  region: "ap-southeast-3",
  timestamp: new Date().toISOString()
}