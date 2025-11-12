"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FALLBACK_CLUSTER_DATA, FALLBACK_AWS_HEALTH } from "@/lib/fallback-data"
import { APICache, DataCache } from "@/lib/cache"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  RefreshCw,
  Server,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  RotateCcw,
  Loader2,
  Wifi,
  WifiOff,
  Terminal,
  BarChart3,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface ServiceMetrics {
  cpu: {
    value: string | null
    unit: string
    timestamp: string | null
  }
  memory: {
    value: string | null
    unit: string
    timestamp: string | null
  }
}

interface ServiceStatus {
  serviceName: string
  serviceArn: string
  status: string
  runningCount: number
  pendingCount: number
  desiredCount: number
  taskDefinition: string
  platformVersion?: string
  createdAt?: string
  cpuSpec?: string | null
  memorySpec?: string | null
  lastDeployment?: {
    status: string
    createdAt: string
    taskDefinition: string
  }
  metrics?: ServiceMetrics
}

interface ClusterData {
  clusterName: string
  status: string
  activeServicesCount: number
  runningTasksCount: number
  pendingTasksCount: number
  services: ServiceStatus[]
  error?: string
}

interface UpdateResult {
  serviceName: string
  success: boolean
  message: string
}

interface AWSHealthStatus {
  status: string
  message: string
  region: string
  timestamp: string
}

export default function ECSStatusDashboard() {
  // Initialize with fallback data for better loading experience and build compatibility
  const [clusters, setClusters] = useState<ClusterData[]>(FALLBACK_CLUSTER_DATA)
  const [selectedCluster, setSelectedCluster] = useState<string>("kairos-pay-cluster-ecs-iac")
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updateResults, setUpdateResults] = useState<UpdateResult[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [awsHealth, setAwsHealth] = useState<AWSHealthStatus | null>(FALLBACK_AWS_HEALTH)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState<Set<string>>(new Set())
  const [metricsData, setMetricsData] = useState<Map<string, ServiceMetrics>>(new Map())

  const clusterNames = ["kairos-pay-cluster-ecs-iac", "kairos-his-cluster-ecs-iac", "kairos-pas-cluster-ecs-iac","kairos-fe-cluster-ecs-iac"]

  const checkAWSHealth = async () => {
    try {
      const response = await fetch("/api/aws-health")
      const healthData = await response.json()
      setAwsHealth(healthData)
    } catch (err) {
      console.error("Failed to check AWS health:", err)
      setAwsHealth({
        status: "error",
        message: "Failed to check AWS connection",
        region: "ap-southeast-3",
        timestamp: new Date().toISOString(),
      })
    }
  }

  const fetchServiceMetrics = async (serviceName: string, clusterName: string) => {
    const serviceKey = `${clusterName}:${serviceName}`

    setLoadingMetrics(prev => new Set(prev).add(serviceKey))

    try {
      const response = await fetch("/api/ecs-metrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceName,
          clusterName,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch metrics")
      }

      const data = await response.json()

      setMetricsData(prev => {
        const newMap = new Map(prev)
        newMap.set(serviceKey, {
          cpu: data.cpu,
          memory: data.memory,
        })
        return newMap
      })
    } catch (err) {
      console.error("Failed to fetch metrics:", err)
    } finally {
      setLoadingMetrics(prev => {
        const newSet = new Set(prev)
        newSet.delete(serviceKey)
        return newSet
      })
    }
  }

  const fetchAllServiceMetrics = async (clusterName: string, services: ServiceStatus[]) => {
    const metricsPromises = services
      .filter(service => service.runningCount > 0)
      .map(service => fetchServiceMetrics(service.serviceName, clusterName))

    await Promise.all(metricsPromises)
  }

  const fetchECSStatus = async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)

      // Try cache first unless force refresh is requested
      if (!forceRefresh) {
        const cachedData = DataCache.get<ClusterData[]>('ecs-status')
        if (cachedData && cachedData.length > 0) {
          setClusters(cachedData)
          setLastUpdated(new Date())
          setLoading(false)
          return
        }
      }

      // Clear cache if force refresh
      if (forceRefresh) {
        DataCache.remove('ecs-status')
      }

      // Add retry logic with exponential backoff
      let retries = 3
      let response: Response | null = null
      
      while (retries > 0) {
        try {
          response = await fetch("/api/ecs-status", {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
            signal: AbortSignal.timeout(30000), // 30 second timeout
          })
          break
        } catch (fetchError) {
          retries--
          if (retries === 0) {
            throw fetchError
          }
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000))
        }
      }

      if (!response) {
        throw new Error("Failed to fetch data after retries")
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch ECS status")
      }

      // Cache the successful response
      DataCache.set('ecs-status', data, 5 * 60 * 1000) // Cache for 5 minutes

      setClusters(data)
      setLastUpdated(new Date())

      // Set first cluster as default if none selected
      if (!selectedCluster && data.length > 0) {
        setSelectedCluster(data[0].clusterName)
      }

      // Clear filter when data refreshes
      setStatusFilter(null)
    } catch (err) {
      console.error('ECS Status fetch error:', err)
      
      let errorMessage = "An error occurred"
      if (err instanceof Error) {
        if (err.name === 'TimeoutError') {
          errorMessage = "Request timed out - please check your connection"
        } else if (err.message.includes('fetch')) {
          errorMessage = "Network error - please check your connection"
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
      
      // If we have cached data, use it as fallback
      const cachedData = DataCache.get<ClusterData[]>('ecs-status')
      if (cachedData && cachedData.length > 0) {
        setClusters(cachedData)
        setError(`${errorMessage} (showing cached data)`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForceUpdate = async () => {
    if (selectedServices.size === 0) {
      setError("Please select at least one service to update")
      return
    }

    try {
      setUpdating(true)
      setError(null)
      setUpdateResults([])

      const response = await fetch("/api/ecs-force-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clusterName: selectedCluster,
          serviceNames: Array.from(selectedServices),
        }),
      })

      const results = await response.json()

      if (!response.ok) {
        throw new Error(results.error || "Failed to update services")
      }

      setUpdateResults(results)

      // Refresh data after update
      await fetchECSStatus()

      // Clear selections
      setSelectedServices(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during update")
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    checkAWSHealth()
    fetchECSStatus()
  }, [])

  // Clear selection when cluster changes manually (not via metric click)
  useEffect(() => {
    setSelectedServices(new Set())
  }, [selectedCluster])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "running":
        return "bg-green-500"
      case "pending":
        return "bg-yellow-500"
      case "stopped":
      case "inactive":
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "running":
        return <CheckCircle className="w-4 h-4" />
      case "pending":
        return <Clock className="w-4 h-4" />
      case "stopped":
      case "inactive":
      case "error":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const selectedClusterData = clusters.find((c) => c.clusterName === selectedCluster)

  const handleServiceSelection = (serviceName: string, checked: boolean) => {
    const newSelected = new Set(selectedServices)
    if (checked) {
      newSelected.add(serviceName)
    } else {
      newSelected.delete(serviceName)
    }
    setSelectedServices(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && selectedClusterData) {
      const filteredServices = getFilteredServices()
      setSelectedServices(new Set(filteredServices.map((s) => s.serviceName)))
    } else {
      setSelectedServices(new Set())
    }
  }

  const handleMetricClick = (clusterName: string, filterType: string) => {
    // If clicking the same cluster, just update filter without triggering useEffect
    if (selectedCluster === clusterName) {
      setStatusFilter(filterType)
    } else {
      setSelectedCluster(clusterName)
      setStatusFilter(filterType)
    }
    setSelectedServices(new Set()) // Clear selected services when filtering
  }

  const getFilteredServices = () => {
    if (!selectedClusterData) return []

    let services = selectedClusterData.services

    if (statusFilter === 'running') {
      services = services.filter(service => service.runningCount > 0)
    } else if (statusFilter === 'pending') {
      services = services.filter(service => service.pendingCount > 0)
    } else if (statusFilter === 'services') {
      // Show all services (no additional filtering)
      services = selectedClusterData.services
    }

    return services
  }

  const clearFilter = () => {
    setStatusFilter(null)
  }

  const handleConnectShell = async (serviceName: string, clusterName: string) => {
    try {
      const region = 'ap-southeast-3' // Based on the region mentioned in the UI

      // Create a comprehensive batch file with error handling
      const batchCommands = [
        '@echo off',
        'title ECS Shell Connection - ' + serviceName,
        'color 0A',
        'echo ====================================================',
        'echo           AWS ECS Shell Connection Tool',
        'echo ====================================================',
        'echo.',
        'echo Service: ' + serviceName,
        'echo Cluster: ' + clusterName,
        'echo Region: ' + region,
        'echo.',
        'echo Checking AWS CLI installation...',
        'aws --version >nul 2>&1',
        'if errorlevel 1 (',
        '    echo ERROR: AWS CLI is not installed or not in PATH',
        '    echo Please install AWS CLI v2 and try again',
        '    pause',
        '    exit /b 1',
        ')',
        'echo AWS CLI found!',
        'echo.',
        'echo Checking AWS credentials...',
        'aws sts get-caller-identity >nul 2>&1',
        'if errorlevel 1 (',
        '    echo ERROR: AWS credentials not configured',
        '    echo Please run "aws configure" first',
        '    pause',
        '    exit /b 1',
        ')',
        'echo AWS credentials OK!',
        'echo.',
        'echo Fetching running tasks for service ' + serviceName + '...',
        `aws ecs list-tasks --cluster ${clusterName} --service-name ${serviceName} --region ${region} --desired-status RUNNING --query "taskArns[0]" --output text > temp_task.txt 2>nul`,
        'if errorlevel 1 (',
        '    echo ERROR: Failed to fetch tasks',
        '    echo Make sure the service exists and you have proper permissions',
        '    pause',
        '    exit /b 1',
        ')',
        'set /p TASK_ARN=<temp_task.txt',
        'if "%TASK_ARN%"=="None" (',
        '    echo ERROR: No running tasks found for this service',
        '    echo The service may be stopped or still starting',
        '    del temp_task.txt 2>nul',
        '    pause',
        '    exit /b 1',
        ')',
        'echo Task ARN: %TASK_ARN%',
        'echo.',
        'echo Getting container information...',
        `aws ecs describe-tasks --cluster ${clusterName} --region ${region} --tasks %TASK_ARN% --query "tasks[0].containers[0].name" --output text > temp_container.txt 2>nul`,
        'if errorlevel 1 (',
        '    echo ERROR: Failed to get container details',
        '    del temp_task.txt 2>nul',
        '    pause',
        '    exit /b 1',
        ')',
        'set /p CONTAINER_NAME=<temp_container.txt',
        'echo Container: %CONTAINER_NAME%',
        'echo.',
        'echo Checking if ECS Exec is enabled...',
        `aws ecs describe-tasks --cluster ${clusterName} --region ${region} --tasks %TASK_ARN% --query "tasks[0].enableExecuteCommand" --output text > temp_exec.txt 2>nul`,
        'set /p EXEC_ENABLED=<temp_exec.txt',
        'if "%EXEC_ENABLED%"=="false" (',
        '    echo WARNING: ECS Exec is not enabled for this task',
        '    echo The service needs to be created/updated with enableExecuteCommand=true',
        '    echo Connection may fail...',
        '    echo.',
        ')',
        'echo ====================================================',
        'echo Connecting to container...',
        'echo Press Ctrl+C to disconnect when done',
        'echo ====================================================',
        'echo.',
        `aws ecs execute-command --cluster ${clusterName} --task %TASK_ARN% --container %CONTAINER_NAME% --interactive --command "/bin/bash" --region ${region}`,
        'if errorlevel 1 (',
        '    echo.',
        '    echo Connection failed. Trying with /bin/sh instead...',
        `    aws ecs execute-command --cluster ${clusterName} --task %TASK_ARN% --container %CONTAINER_NAME% --interactive --command "/bin/sh" --region ${region}`,
        ')',
        'echo.',
        'echo Connection closed.',
        'echo Cleaning up temporary files...',
        'del temp_task.txt temp_container.txt temp_exec.txt 2>nul',
        'echo Done.',
        'pause'
      ].join('\r\n')

      // Create and download the batch file
      const blob = new Blob([batchCommands], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ecs-shell-${serviceName}-${Date.now()}.bat`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Show instruction modal/alert
      const message = `📥 Shell connection script downloaded!

🔧 Prerequisites:
• AWS CLI v2 installed
• AWS credentials configured (aws configure)
• ECS Execute Command enabled for the service

📋 Instructions:
1. Run the downloaded .bat file
2. The script will automatically connect you to the container
3. Use Ctrl+C to disconnect when done

⚠️ Note: If connection fails, the service may need ECS Exec enabled.`

      alert(message)

    } catch (err) {
      console.error('Error creating shell connection:', err)
      alert('❌ Error creating shell connection script. Please try again.')
    }
  }

  if (error && clusters.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading ECS Status</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => fetchECSStatus(true)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={checkAWSHealth}>
                <Wifi className="w-4 h-4 mr-2" />
                Check AWS Connection
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with AWS Health Status */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">ECS Cluster Management</h1>
            <div className="flex items-center gap-4">
              <p className="text-gray-600">Monitor and manage your Amazon ECS clusters and services</p>
              <a
                href="/secrets-manager"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                🔐 Secrets Manager
              </a>
              {awsHealth && (
                <Badge
                  variant={awsHealth.status === "healthy" ? "default" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {awsHealth.status === "healthy" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  AWS {awsHealth.status} ({awsHealth.region})
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && <p className="text-sm text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>}
            <Button onClick={checkAWSHealth} variant="outline" size="sm">
              <Wifi className="w-4 h-4 mr-2" />
              Check AWS
            </Button>
            <Button onClick={() => fetchECSStatus(true)} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* AWS Health Alert */}
        {awsHealth && awsHealth.status !== "healthy" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>AWS Connection Issue:</strong> {awsHealth.message}
              <br />
              <small>
                Region: {awsHealth.region} | Last checked: {new Date(awsHealth.timestamp).toLocaleString()}
              </small>
            </AlertDescription>
          </Alert>
        )}

        {/* Cluster Overview Cards */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {clusterNames.map((name) => (
              <Card key={name}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {clusters.map((cluster) => (
              <Card
                key={cluster.clusterName}
                className={`cursor-pointer transition-all ${selectedCluster === cluster.clusterName ? "ring-2 ring-blue-500" : ""} ${cluster.error ? "border-red-200 bg-red-50" : ""}`}
                onClick={() => setSelectedCluster(cluster.clusterName)}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    <CardTitle className="text-lg">{cluster.clusterName}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(cluster.status)}`} />
                    <CardDescription className="capitalize">{cluster.status}</CardDescription>
                  </div>
                  {cluster.error && <div className="text-xs text-red-600 mt-1">Error: {cluster.error}</div>}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div
                      className="text-center cursor-pointer hover:bg-blue-50 rounded p-2 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMetricClick(cluster.clusterName, 'services')
                      }}
                    >
                      <div className="text-xl font-bold text-blue-600">{cluster.activeServicesCount}</div>
                      <div className="text-xs text-gray-600">Services</div>
                    </div>
                    <div
                      className="text-center cursor-pointer hover:bg-green-50 rounded p-2 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMetricClick(cluster.clusterName, 'running')
                      }}
                    >
                      <div className="text-xl font-bold text-green-600">{cluster.runningTasksCount}</div>
                      <div className="text-xs text-gray-600">Running</div>
                    </div>
                    <div
                      className="text-center cursor-pointer hover:bg-yellow-50 rounded p-2 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMetricClick(cluster.clusterName, 'pending')
                      }}
                    >
                      <div className="text-xl font-bold text-yellow-600">{cluster.pendingTasksCount}</div>
                      <div className="text-xs text-gray-600">Pending</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Cluster Selection and Service Management */}
        {!loading && clusters.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Service Management
                    {statusFilter && (
                      <Badge variant="secondary" className="capitalize">
                        Filtered by: {statusFilter}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                          onClick={clearFilter}
                        >
                          ×
                        </Button>
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Select and manage services in your ECS cluster (Region: ap-southeast-3)
                    {statusFilter && (
                      <span className="block text-blue-600 mt-1">
                        Showing services with {statusFilter === 'running' ? 'running tasks' : statusFilter === 'pending' ? 'pending tasks' : 'active status'}
                      </span>
                    )}
                    <span className="block text-sm text-gray-500 mt-1">
                      💡 Click the chart icon button to fetch CPU/RAM metrics from CloudWatch • Use Shell button to download connection scripts
                    </span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={selectedCluster} onValueChange={(value) => {
                    setSelectedCluster(value)
                    setStatusFilter(null) // Clear filter when manually changing cluster
                  }}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select a cluster" />
                    </SelectTrigger>
                    <SelectContent>
                      {clusters.map((cluster) => (
                        <SelectItem key={cluster.clusterName} value={cluster.clusterName}>
                          {cluster.clusterName}
                          {cluster.error && <span className="text-red-500 ml-2">(Error)</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => selectedClusterData && fetchAllServiceMetrics(selectedCluster, getFilteredServices())}
                    disabled={!selectedClusterData || getFilteredServices().filter(s => s.runningCount > 0).length === 0 || loadingMetrics.size > 0}
                    variant="outline"
                  >
                    {loadingMetrics.size > 0 ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <BarChart3 className="w-4 h-4 mr-2" />
                    )}
                    Load All Metrics
                  </Button>
                  <Button
                    onClick={handleForceUpdate}
                    disabled={selectedServices.size === 0 || updating}
                    variant="destructive"
                  >
                    {updating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4 mr-2" />
                    )}
                    Force Update ({selectedServices.size})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {updateResults.length > 0 && (
                <Alert className="mb-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Update Results:</p>
                      {updateResults.map((result, index) => (
                        <p key={index} className={result.success ? "text-green-600" : "text-red-600"}>
                          {result.serviceName}: {result.message}
                        </p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {selectedClusterData && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        getFilteredServices().length > 0 &&
                        selectedServices.size === getFilteredServices().length
                      }
                      onCheckedChange={handleSelectAll}
                      disabled={getFilteredServices().length === 0}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium">
                      Select All Services ({getFilteredServices().length}
                      {statusFilter && ` filtered from ${selectedClusterData.services.length} total`})
                    </label>
                  </div>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Select</TableHead>
                          <TableHead>Service Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Tasks</TableHead>
                          <TableHead>CPU</TableHead>
                          <TableHead>RAM</TableHead>
                          <TableHead>Task Definition</TableHead>
                          <TableHead>Last Deployment</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="w-32">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedClusterData.error ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8">
                              <div className="text-red-600">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                <p className="font-medium">Error loading services</p>
                                <p className="text-sm">{selectedClusterData.error}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : getFilteredServices().length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                              {statusFilter
                                ? `No services found with ${statusFilter === 'running' ? 'running tasks' : statusFilter === 'pending' ? 'pending tasks' : 'active status'}`
                                : "No services found in this cluster"
                              }
                              {statusFilter && (
                                <div className="mt-2">
                                  <Button variant="outline" size="sm" onClick={clearFilter}>
                                    Clear Filter
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (
                          getFilteredServices().map((service) => (
                            <TableRow key={service.serviceName}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedServices.has(service.serviceName)}
                                  onCheckedChange={(checked) =>
                                    handleServiceSelection(service.serviceName, checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell className="font-medium">{service.serviceName}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                  {getStatusIcon(service.status)}
                                  <span className="capitalize">{service.status}</span>
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>
                                    Running: {service.runningCount}/{service.desiredCount}
                                  </div>
                                  {service.pendingCount > 0 && (
                                    <div className="text-yellow-600">Pending: {service.pendingCount}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const serviceKey = `${selectedCluster}:${service.serviceName}`
                                  const metrics = metricsData.get(serviceKey)
                                  const isLoading = loadingMetrics.has(serviceKey)

                                  // Format CPU spec (convert to vCPU if it's a number)
                                  const formatCpuSpec = (spec: string | null | undefined) => {
                                    if (!spec) return null
                                    const cpuNum = parseInt(spec)
                                    if (cpuNum >= 1024) {
                                      return `${(cpuNum / 1024).toFixed(2)} vCPU`
                                    }
                                    return `${spec} units`
                                  }

                                  const cpuSpecFormatted = formatCpuSpec(service.cpuSpec)

                                  if (service.runningCount === 0) {
                                    return (
                                      <div className="text-sm">
                                        <span className="text-gray-400">N/A</span>
                                        {cpuSpecFormatted && (
                                          <div className="text-xs text-gray-400 mt-0.5">
                                            Spec: {cpuSpecFormatted}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  }

                                  if (isLoading) {
                                    return (
                                      <div className="text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                        {cpuSpecFormatted && (
                                          <div className="text-xs text-gray-500 mt-0.5">
                                            {cpuSpecFormatted}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  }

                                  if (metrics?.cpu.value) {
                                    return (
                                      <div className="text-sm">
                                        <span className={`font-medium ${parseFloat(metrics.cpu.value) > 80 ? 'text-red-600' : parseFloat(metrics.cpu.value) > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                                          {metrics.cpu.value}%
                                        </span>
                                        {cpuSpecFormatted && (
                                          <div className="text-xs text-gray-500 mt-0.5">
                                            {cpuSpecFormatted}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  }

                                  return (
                                    <div className="text-sm">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => fetchServiceMetrics(service.serviceName, selectedCluster)}
                                        className="h-6 px-2 text-xs"
                                      >
                                        <BarChart3 className="w-3 h-3 mr-1" />
                                        Load
                                      </Button>
                                      {cpuSpecFormatted && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {cpuSpecFormatted}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const serviceKey = `${selectedCluster}:${service.serviceName}`
                                  const metrics = metricsData.get(serviceKey)
                                  const isLoading = loadingMetrics.has(serviceKey)

                                  // Format Memory spec
                                  const formatMemorySpec = (spec: string | null | undefined) => {
                                    if (!spec) return null
                                    const memNum = parseInt(spec)
                                    if (memNum >= 1024) {
                                      return `${(memNum / 1024).toFixed(2)} GB`
                                    }
                                    return `${spec} MB`
                                  }

                                  const memorySpecFormatted = formatMemorySpec(service.memorySpec)

                                  if (service.runningCount === 0) {
                                    return (
                                      <div className="text-sm">
                                        <span className="text-gray-400">N/A</span>
                                        {memorySpecFormatted && (
                                          <div className="text-xs text-gray-400 mt-0.5">
                                            Spec: {memorySpecFormatted}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  }

                                  if (isLoading) {
                                    return (
                                      <div className="text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                        {memorySpecFormatted && (
                                          <div className="text-xs text-gray-500 mt-0.5">
                                            {memorySpecFormatted}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  }

                                  if (metrics?.memory.value) {
                                    return (
                                      <div className="text-sm">
                                        <span className={`font-medium ${parseFloat(metrics.memory.value) > 80 ? 'text-red-600' : parseFloat(metrics.memory.value) > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                                          {metrics.memory.value}%
                                        </span>
                                        {memorySpecFormatted && (
                                          <div className="text-xs text-gray-500 mt-0.5">
                                            {memorySpecFormatted}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  }

                                  return (
                                    <div className="text-sm">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => fetchServiceMetrics(service.serviceName, selectedCluster)}
                                        className="h-6 px-2 text-xs"
                                      >
                                        <BarChart3 className="w-3 h-3 mr-1" />
                                        Load
                                      </Button>
                                      {memorySpecFormatted && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {memorySpecFormatted}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}
                              </TableCell>
                              <TableCell className="font-mono text-sm">{service.taskDefinition}</TableCell>
                              <TableCell>
                                {service.lastDeployment ? (
                                  <div className="text-sm">
                                    <div className="capitalize">{service.lastDeployment.status}</div>
                                    <div className="text-gray-500">
                                      {new Date(service.lastDeployment.createdAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {service.createdAt ? new Date(service.createdAt).toLocaleDateString() : "N/A"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {(() => {
                                    const serviceKey = `${selectedCluster}:${service.serviceName}`
                                    const metrics = metricsData.get(serviceKey)
                                    const isLoading = loadingMetrics.has(serviceKey)

                                    return (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fetchServiceMetrics(service.serviceName, selectedCluster)}
                                        disabled={service.runningCount === 0 || isLoading}
                                        className="flex items-center gap-1 hover:bg-blue-50 hover:border-blue-300"
                                        title={
                                          service.runningCount === 0
                                            ? "No running tasks available"
                                            : metrics
                                              ? `CPU: ${metrics.cpu.value || 'N/A'}% | RAM: ${metrics.memory.value || 'N/A'}%`
                                              : "Fetch CPU and RAM metrics from CloudWatch"
                                        }
                                      >
                                        {isLoading ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : metrics ? (
                                          <CheckCircle className="w-3 h-3 text-green-600" />
                                        ) : (
                                          <BarChart3 className="w-3 h-3" />
                                        )}
                                      </Button>
                                    )
                                  })()}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleConnectShell(service.serviceName, selectedCluster)}
                                    disabled={service.runningCount === 0}
                                    className="flex items-center gap-1 hover:bg-green-50 hover:border-green-300"
                                    title={
                                      service.runningCount === 0
                                        ? "❌ No running tasks available for shell connection"
                                        : `🔗 Download shell connection script for ${service.serviceName}\n\n• Downloads a .bat file to connect via AWS CLI\n• Requires AWS CLI v2 and proper credentials\n• ECS Exec must be enabled for the service`
                                    }
                                  >
                                    <Terminal className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
