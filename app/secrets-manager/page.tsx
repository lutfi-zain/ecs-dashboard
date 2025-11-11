"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  RefreshCw,
  Key,
  Eye,
  Edit,
  Trash2,
  Plus,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"

interface Secret {
  arn: string
  name: string
  description?: string
  lastChangedDate?: string
  lastAccessedDate?: string
  value?: any
  versionId?: string
  createdDate?: string
}

export default function SecretsManagerPage() {
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Modals
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentSecret, setCurrentSecret] = useState<Secret | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    value: "",
    description: "",
  })

  useEffect(() => {
    loadSecrets()
  }, [])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const loadSecrets = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/secrets-manager")
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load secrets")
      }

      setSecrets(data.data)
      setLastUpdated(new Date())
    } catch (err: any) {
      setError(err.message || "Failed to load secrets")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewSecret = async (secretName: string) => {
    try {
      const response = await fetch(`/api/secrets-manager/${encodeURIComponent(secretName)}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load secret value")
      }

      setCurrentSecret(data.data)
      setViewModalOpen(true)
    } catch (err: any) {
      setError(err.message || "Failed to load secret value")
      console.error(err)
    }
  }

  const handleEditSecret = async (secretName: string) => {
    try {
      const response = await fetch(`/api/secrets-manager/${encodeURIComponent(secretName)}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load secret")
      }

      const secretData = data.data
      setCurrentSecret(secretData)
      setFormData({
        name: secretData.name,
        value:
          typeof secretData.value === "string"
            ? secretData.value
            : JSON.stringify(secretData.value, null, 2),
        description: "",
      })
      setEditModalOpen(true)
    } catch (err: any) {
      setError(err.message || "Failed to load secret for editing")
      console.error(err)
    }
  }

  const handleCreateSecret = () => {
    setFormData({ name: "", value: "", description: "" })
    setCreateModalOpen(true)
  }

  const handleSubmitCreate = async () => {
    try {
      setSubmitting(true)
      setError(null)

      let secretValue = formData.value

      // Try to parse as JSON
      try {
        if (formData.value.trim().startsWith("{") || formData.value.trim().startsWith("[")) {
          secretValue = JSON.parse(formData.value)
        }
      } catch {
        // Keep as string if not valid JSON
      }

      const response = await fetch("/api/secrets-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          value: secretValue,
          description: formData.description,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create secret")
      }

      setSuccess("Secret created successfully")
      setCreateModalOpen(false)
      setFormData({ name: "", value: "", description: "" })
      loadSecrets()
    } catch (err: any) {
      setError(err.message || "Failed to create secret")
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitUpdate = async () => {
    if (!currentSecret) return

    try {
      setSubmitting(true)
      setError(null)

      let secretValue = formData.value

      // Try to parse as JSON
      try {
        if (formData.value.trim().startsWith("{") || formData.value.trim().startsWith("[")) {
          secretValue = JSON.parse(formData.value)
        }
      } catch {
        // Keep as string if not valid JSON
      }

      const response = await fetch(`/api/secrets-manager/${encodeURIComponent(currentSecret.name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: secretValue,
          description: formData.description,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update secret")
      }

      setSuccess("Secret updated successfully")
      setEditModalOpen(false)
      setCurrentSecret(null)
      setFormData({ name: "", value: "", description: "" })
      loadSecrets()
    } catch (err: any) {
      setError(err.message || "Failed to update secret")
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSecret = async () => {
    if (!currentSecret) return

    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch(`/api/secrets-manager/${encodeURIComponent(currentSecret.name)}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete secret")
      }

      setSuccess("Secret deleted successfully (30-day recovery window)")
      setDeleteDialogOpen(false)
      setCurrentSecret(null)
      loadSecrets()
    } catch (err: any) {
      setError(err.message || "Failed to delete secret")
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess("Copied to clipboard")
  }

  const filteredSecrets = secrets.filter((secret) =>
    secret.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <a
                href="/"
                className="text-blue-600 hover:text-blue-800 hover:underline text-sm flex items-center gap-1"
              >
                ← Back to Dashboard
              </a>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AWS Secrets Manager</h1>
            <p className="text-gray-600">Securely manage and access your application secrets</p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <p className="text-sm text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>
            )}
            <Button onClick={loadSecrets} disabled={loading} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={handleCreateSecret}>
              <Plus className="w-4 h-4 mr-2" />
              Create Secret
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Secrets Management
                </CardTitle>
                <CardDescription>
                  View, create, update, and delete secrets in AWS Secrets Manager (Region: ap-southeast-3)
                </CardDescription>
              </div>
              <Input
                type="text"
                placeholder="Search secrets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Secret Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Last Changed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }, (_, index) => `loading-row-${index}`).map((key) => (
                      <TableRow key={key}>
                        <TableCell>
                          <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-64" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-32 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <>
                      {filteredSecrets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                            {searchTerm ? "No secrets found matching your search" : "No secrets found"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSecrets.map((secret) => (
                          <TableRow key={secret.arn}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Key className="w-4 h-4 text-gray-500" />
                                {secret.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600">{secret.description || "-"}</TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {secret.lastChangedDate
                                ? new Date(secret.lastChangedDate).toLocaleString()
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewSecret(secret.name)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditSecret(secret.name)}
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCurrentSecret(secret)
                                    setDeleteDialogOpen(true)
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* View Secret Modal */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                View Secret: {currentSecret?.name}
              </DialogTitle>
              <DialogDescription>Secret value and metadata</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                  {(() => {
                    if (!currentSecret?.value) return ""
                    if (typeof currentSecret.value === "string") return currentSecret.value
                    return JSON.stringify(currentSecret.value, null, 2)
                  })()}
                </pre>
              </div>
              {currentSecret?.createdDate && (
                <p className="text-sm text-gray-500">
                  Created: {new Date(currentSecret.createdDate).toLocaleString()}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  let value = ""
                  if (currentSecret?.value) {
                    value = typeof currentSecret.value === "string"
                      ? currentSecret.value
                      : JSON.stringify(currentSecret.value, null, 2)
                  }
                  copyToClipboard(value)
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Value
              </Button>
              <Button onClick={() => setViewModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Secret Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New Secret
              </DialogTitle>
              <DialogDescription>Add a new secret to AWS Secrets Manager</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Secret Name *</Label>
                <Input
                  id="create-name"
                  placeholder="my-secret-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-value">Secret Value *</Label>
                <Textarea
                  id="create-value"
                  placeholder='{"key": "value"} or plain text'
                  rows={8}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500">Enter as plain text or JSON format</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  placeholder="Optional description"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitCreate}
                disabled={submitting || !formData.name || !formData.value}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Secret
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Secret Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Update Secret: {currentSecret?.name}
              </DialogTitle>
              <DialogDescription>Update the secret value</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-value">Secret Value *</Label>
                <Textarea
                  id="edit-value"
                  placeholder='{"key": "value"} or plain text'
                  rows={8}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500">Enter as plain text or JSON format</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Optional description"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmitUpdate} disabled={submitting || !formData.value}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Update Secret
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will schedule the secret <strong>{currentSecret?.name}</strong> for deletion with a
                30-day recovery window. You can restore it within this period.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSecret}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Secret"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
