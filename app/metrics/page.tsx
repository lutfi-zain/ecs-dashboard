"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Loader2, BarChart3, AlertCircle, Calendar, Clock, TrendingUp, RefreshCw } from "lucide-react"

interface MetricDataPoint {
  timestamp: string
  value: number
}

interface MetricsData {
  cpu: MetricDataPoint[]
  memory: MetricDataPoint[]
}

interface Service {
  name: string
  arn: string
  status: string
  runningCount: number
  desiredCount: number
}

export default function MetricsPage() {
  const [clusterName, setClusterName] = useState("kairos-pay-cluster-ecs-iac")
  const [serviceName, setServiceName] = useState("")
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [timeRange, setTimeRange] = useState("1") // hours
  const [customStartTime, setCustomStartTime] = useState("")
  const [customEndTime, setCustomEndTime] = useState("")
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null)
  const [metricType, setMetricType] = useState<"cpu" | "memory" | "both">("both")

  const clusterNames = [
    "kairos-pay-cluster-ecs-iac",
    "kairos-his-cluster-ecs-iac",
    "kairos-pas-cluster-ecs-iac",
    "kairos-fe-cluster-ecs-iac",
  ]

  const timeRanges = [
    { value: "0.25", label: "Last 15 minutes" },
    { value: "0.5", label: "Last 30 minutes" },
    { value: "1", label: "Last 1 hour" },
    { value: "3", label: "Last 3 hours" },
    { value: "6", label: "Last 6 hours" },
    { value: "12", label: "Last 12 hours" },
    { value: "24", label: "Last 24 hours" },
    { value: "48", label: "Last 2 days" },
    { value: "168", label: "Last 7 days" },
  ]

  // Fetch services when cluster changes
  useEffect(() => {
    fetchServices()
  }, [clusterName])

  const fetchServices = async () => {
    try {
      setLoadingServices(true)
      setServiceName("") // Reset service selection
      setError(null)

      const response = await fetch("/api/ecs-services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clusterName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(data.error || "Too many requests. Please try again later.")
        }
        throw new Error(data.error || "Failed to fetch services")
      }

      setServices(data.services || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch services"
      console.error("Failed to fetch services:", err)
      setError(errorMessage)
      setServices([])
    } finally {
      setLoadingServices(false)
    }
  }

  const fetchMetrics = async () => {
    if (!serviceName.trim()) {
      setError("Please select a service")
      return
    }

    try {
      setLoading(true)
      setError(null)

      let startTime: Date
      let endTime: Date

      if (useCustomRange) {
        if (!customStartTime || !customEndTime) {
          setError("Please provide both start and end times for custom range")
          return
        }
        startTime = new Date(customStartTime)
        endTime = new Date(customEndTime)

        if (startTime >= endTime) {
          setError("Start time must be before end time")
          return
        }
      } else {
        endTime = new Date()
        const hours = parseFloat(timeRange)
        startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000)
      }

      const response = await fetch("/api/ecs-metrics-range", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clusterName,
          serviceName,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          metricType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(data.error || "Too many requests. Please wait before trying again.")
        }
        throw new Error(data.error || "Failed to fetch metrics")
      }

      setMetricsData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatChartData = () => {
    if (!metricsData) return []

    const dataMap = new Map<string, { timestamp: string; cpu?: number; memory?: number }>()

    metricsData.cpu.forEach((point) => {
      const key = new Date(point.timestamp).getTime()
      dataMap.set(key.toString(), {
        timestamp: new Date(point.timestamp).toLocaleString(),
        cpu: point.value,
      })
    })

    metricsData.memory.forEach((point) => {
      const key = new Date(point.timestamp).getTime()
      const existing = dataMap.get(key.toString())
      if (existing) {
        existing.memory = point.value
      } else {
        dataMap.set(key.toString(), {
          timestamp: new Date(point.timestamp).toLocaleString(),
          memory: point.value,
        })
      }
    })

    return Array.from(dataMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }

  const chartData = formatChartData()

  const calculateStats = (data: MetricDataPoint[]) => {
    if (data.length === 0) return { avg: 0, min: 0, max: 0, current: 0 }

    const values = data.map((d) => d.value)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    const current = values[values.length - 1]

    return { avg, min, max, current }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-8 h-8" />
              ECS Metrics Dashboard
            </h1>
            <p className="text-gray-600">
              Monitor CPU and Memory usage over time with customizable ranges
            </p>
          </div>
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 hover:underline text-sm flex items-center gap-1"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Metrics Configuration
            </CardTitle>
            <CardDescription>
              Select cluster, service, and time range to view metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cluster Selection */}
              <div className="space-y-2">
                <Label htmlFor="cluster">Cluster Name</Label>
                <Select value={clusterName} onValueChange={setClusterName}>
                  <SelectTrigger id="cluster">
                    <SelectValue placeholder="Select cluster" />
                  </SelectTrigger>
                  <SelectContent>
                    {clusterNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Service Name */}
              <div className="space-y-2">
                <Label htmlFor="service">Service Name</Label>
                <div className="flex gap-2">
                  <Select
                    value={serviceName}
                    onValueChange={setServiceName}
                    disabled={loadingServices || services.length === 0}
                  >
                    <SelectTrigger id="service" className="flex-1">
                      <SelectValue
                        placeholder={
                          loadingServices
                            ? "Loading services..."
                            : services.length === 0
                              ? "No services found"
                              : "Select a service"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.name} value={service.name}>
                          <div className="flex items-center justify-between gap-2">
                            <span>{service.name}</span>
                            <span className="text-xs text-gray-500">
                              ({service.runningCount}/{service.desiredCount} running)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={fetchServices}
                    disabled={loadingServices}
                    title="Refresh services list"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingServices ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Metric Type */}
              <div className="space-y-2">
                <Label htmlFor="metric-type">Metric Type</Label>
                <Select value={metricType} onValueChange={(value: any) => setMetricType(value)}>
                  <SelectTrigger id="metric-type">
                    <SelectValue placeholder="Select metric type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">CPU & Memory</SelectItem>
                    <SelectItem value="cpu">CPU Only</SelectItem>
                    <SelectItem value="memory">Memory Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Range Toggle */}
              <div className="space-y-2">
                <Label>Time Range Type</Label>
                <div className="flex gap-2">
                  <Button
                    variant={!useCustomRange ? "default" : "outline"}
                    onClick={() => setUseCustomRange(false)}
                    className="flex-1"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Preset
                  </Button>
                  <Button
                    variant={useCustomRange ? "default" : "outline"}
                    onClick={() => setUseCustomRange(true)}
                    className="flex-1"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Custom
                  </Button>
                </div>
              </div>
            </div>

            {/* Preset Time Range */}
            {!useCustomRange && (
              <div className="space-y-2">
                <Label htmlFor="time-range">Time Range</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger id="time-range">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Time Range */}
            {useCustomRange && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="datetime-local"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="datetime-local"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Fetch Button */}
            <Button onClick={fetchMetrics} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading Metrics...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Fetch Metrics
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        {metricsData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(metricType === "both" || metricType === "cpu") && metricsData.cpu.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">CPU Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const stats = calculateStats(metricsData.cpu)
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Current</p>
                          <p className="text-2xl font-bold text-blue-600">{stats.current.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Average</p>
                          <p className="text-2xl font-bold">{stats.avg.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Minimum</p>
                          <p className="text-xl font-semibold text-green-600">{stats.min.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Maximum</p>
                          <p className="text-xl font-semibold text-red-600">{stats.max.toFixed(2)}%</p>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )}

            {(metricType === "both" || metricType === "memory") && metricsData.memory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Memory Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const stats = calculateStats(metricsData.memory)
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Current</p>
                          <p className="text-2xl font-bold text-purple-600">{stats.current.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Average</p>
                          <p className="text-2xl font-bold">{stats.avg.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Minimum</p>
                          <p className="text-xl font-semibold text-green-600">{stats.min.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Maximum</p>
                          <p className="text-xl font-semibold text-red-600">{stats.max.toFixed(2)}%</p>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Chart */}
        {metricsData && chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Metrics Over Time</CardTitle>
              <CardDescription>
                {serviceName} on {clusterName} - {chartData.length} data points
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    label={{ value: "Usage (%)", angle: -90, position: "insideLeft" }}
                    domain={[0, 100]}
                  />
                  <Tooltip />
                  <Legend />
                  {(metricType === "both" || metricType === "cpu") && (
                    <Line
                      type="monotone"
                      dataKey="cpu"
                      stroke="#3b82f6"
                      name="CPU (%)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                  {(metricType === "both" || metricType === "memory") && (
                    <Line
                      type="monotone"
                      dataKey="memory"
                      stroke="#a855f7"
                      name="Memory (%)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* No Data Message */}
        {metricsData && chartData.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600">No metrics data available for the selected time range</p>
              <p className="text-sm text-gray-500 mt-2">
                Try selecting a different time range or check if the service has been running
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
