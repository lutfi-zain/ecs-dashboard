"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

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
  lastDeployment?: {
    status: string
    createdAt: string
    taskDefinition: string
  }
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
  const [clusters, setClusters] = useState<ClusterData[]>([])
  const [selectedCluster, setSelectedCluster] = useState<string>("")
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updateResults, setUpdateResults] = useState<UpdateResult[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [awsHealth, setAwsHealth] = useState<AWSHealthStatus | null>(null)

  const clusterNames = ["kairos-pay-cluster-ecs-iac", "kairos-his-cluster-ecs-iac", "kairos-pas-cluster-ecs-iac"]

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

  const fetchECSStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/ecs-status")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch ECS status")
      }

      setClusters(data)
      setLastUpdated(new Date())

      // Set first cluster as default if none selected
      if (!selectedCluster && data.length > 0) {
        setSelectedCluster(data[0].clusterName)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
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
      setSelectedServices(new Set(selectedClusterData.services.map((s) => s.serviceName)))
    } else {
      setSelectedServices(new Set())
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
              <Button onClick={fetchECSStatus}>
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
            <Button onClick={fetchECSStatus} disabled={loading}>
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
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">{cluster.activeServicesCount}</div>
                      <div className="text-xs text-gray-600">Services</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">{cluster.runningTasksCount}</div>
                      <div className="text-xs text-gray-600">Running</div>
                    </div>
                    <div className="text-center">
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
                  <CardTitle>Service Management</CardTitle>
                  <CardDescription>
                    Select and manage services in your ECS cluster (Region: ap-southeast-3)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={selectedCluster} onValueChange={setSelectedCluster}>
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
                        selectedClusterData.services.length > 0 &&
                        selectedServices.size === selectedClusterData.services.length
                      }
                      onCheckedChange={handleSelectAll}
                      disabled={selectedClusterData.services.length === 0}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium">
                      Select All Services ({selectedClusterData.services.length})
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
                          <TableHead>Task Definition</TableHead>
                          <TableHead>Last Deployment</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedClusterData.error ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <div className="text-red-600">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                <p className="font-medium">Error loading services</p>
                                <p className="text-sm">{selectedClusterData.error}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : selectedClusterData.services.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                              No services found in this cluster
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedClusterData.services.map((service) => (
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
