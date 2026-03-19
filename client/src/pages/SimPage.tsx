import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, Smartphone, Loader2, Upload } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import BulkUploadDialog from '@/components/BulkUploadDialog'

interface Sim {
  id: number
  sim_number: string
  employee_id: number
  employee_name: string
  employee_status: string
  status: 'active' | 'inactive' | 'returned'
  assigned_date: string
  notes: string | null
  created_at: string
}

interface Employee {
  id: number
  employee_id: string
  full_name: string
  department: string
  status: string
}

const emptySim = {
  sim_number: '',
  employee_id: 0,
  status: 'active' as const,
  assigned_date: '',
  notes: '',
}

export default function SimPage() {
  const [sims, setSims] = useState<Sim[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [selectedSim, setSelectedSim] = useState<Sim | null>(null)
  const [formData, setFormData] = useState(emptySim)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [simsResponse, employeesResponse] = await Promise.all([
        api.get('/sims'),
        api.get('/employees?status=active')
      ])
      setSims(simsResponse.data)
      setEmployees(employeesResponse.data)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredSims = useMemo(() => {
    return sims.filter((sim) => {
      const matchesSearch =
        searchTerm === '' ||
        sim.sim_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sim.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' || sim.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [sims, searchTerm, statusFilter])

  const handleOpenDialog = (sim?: Sim) => {
    if (sim) {
      setSelectedSim(sim)
      setFormData({
        sim_number: sim.sim_number,
        employee_id: sim.employee_id,
        status: sim.status,
        assigned_date: sim.assigned_date || '',
        notes: sim.notes || '',
      })
    } else {
      setSelectedSim(null)
      setFormData(emptySim)
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (selectedSim) {
        await api.put(`/sims/${selectedSim.id}`, formData)
        toast.success('SIM card updated successfully')
      } else {
        await api.post('/sims', formData)
        toast.success('SIM card created successfully')
      }
      setIsDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save SIM card')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSim) return

    try {
      await api.delete(`/sims/${selectedSim.id}`)
      toast.success('SIM card deleted successfully')
      setIsDeleteDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete SIM card')
    }
  }

  const openDeleteDialog = (sim: Sim) => {
    setSelectedSim(sim)
    setIsDeleteDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-success/20 text-success hover:bg-success/30">
            Active
          </Badge>
        )
      case 'inactive':
        return (
          <Badge className="bg-warning/20 text-warning hover:bg-warning/30">
            Inactive
          </Badge>
        )
      case 'returned':
        return (
          <Badge className="bg-muted text-muted-foreground hover:bg-muted/80">
            Returned
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SIM Cards</h1>
          <p className="text-muted-foreground">
            Manage SIM card allocations and tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add SIM Card
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by SIM number or employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              SIM Card List
            </CardTitle>
            <Badge variant="secondary">{filteredSims.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSims.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <Smartphone className="mb-4 h-12 w-12" />
              <p>No SIM cards found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>SIM Number</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Employee Status</TableHead>
                    <TableHead>SIM Status</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSims.map((sim) => (
                    <TableRow key={sim.id}>
                      <TableCell className="font-medium">{sim.id}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {sim.sim_number}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{sim.employee_name || '-'}</p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={sim.employee_status === 'active' ? 'default' : 'secondary'}
                          className={
                            sim.employee_status === 'active'
                              ? 'bg-success/20 text-success hover:bg-success/30'
                              : 'bg-destructive/20 text-destructive hover:bg-destructive/30'
                          }
                        >
                          {sim.employee_status === 'active' ? 'Active' : 'Exited'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(sim.status)}</TableCell>
                      <TableCell>
                        {sim.assigned_date ? formatDate(sim.assigned_date) : '-'}
                      </TableCell>
                      <TableCell className="max-w-32 truncate">
                        {sim.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(sim)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(sim)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedSim ? 'Edit SIM Card' : 'Add New SIM Card'}
            </DialogTitle>
            <DialogDescription>
              {selectedSim
                ? 'Update the SIM card information below'
                : 'Fill in the details to add a new SIM card'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sim_number">SIM Number</Label>
                <Input
                  id="sim_number"
                  value={formData.sim_number}
                  onChange={(e) =>
                    setFormData({ ...formData, sim_number: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Assign To Employee</Label>
                  <Select
                    value={formData.employee_id?.toString() || '0'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        employee_id: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        status: value as 'active' | 'inactive' | 'returned',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned_date">Assigned Date</Label>
                <Input
                  id="assigned_date"
                  type="date"
                  value={formData.assigned_date}
                  onChange={(e) =>
                    setFormData({ ...formData, assigned_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this SIM card..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : selectedSim ? (
                  'Update SIM Card'
                ) : (
                  'Add SIM Card'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the SIM card{' '}
              <strong>{selectedSim?.sim_number}</strong>. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        type="sims"
        onSuccess={fetchData}
      />
    </div>
  )
}
