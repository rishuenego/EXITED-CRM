import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
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
import {
  Plus,
  Search,
  Eye,
  LogOut,
  Loader2,
  X,
  Briefcase,
  Monitor,
  Key,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Upload,
  CalendarIcon,
} from 'lucide-react'
import api from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import BulkUploadDialog from '@/components/BulkUploadDialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'

interface Employee {
  id: number
  employee_id: string
  full_name: string
  department: string
  status: string
}

interface ExitRecord {
  id: number
  employee_id: number
  employee_name: string
  exit_type: 'sales' | 'admin_digital' | 'hr' | 'accounts' | 'director'
  exit_date: string
  sim_taken: boolean
  whatsapp_logged_out: boolean
  crm_mail_removed: boolean
  dialer_removed: boolean
  laptop_taken: boolean
  sim_given_to: string | null
  sim_given_to_name: string | null
  laptop_given_to: string | null
  laptop_given_to_name: string | null
  accessories: string | null
  reason: string | null
  created_by: string
  created_at: string
  credentials?: Credential[]
}

interface Credential {
  id: number
  label: string
  url: string
  username: string
  password: string
  notes: string
}

interface ExitFormData {
  employee_id: number
  exit_type: 'sales' | 'admin_digital' | 'hr' | 'accounts' | 'director'
  exit_date: string
  sim_taken: boolean
  whatsapp_logged_out: boolean
  crm_mail_removed: boolean
  dialer_removed: boolean
  laptop_taken: boolean
  sim_given_to: string
  laptop_given_to: string
  accessories: string
  reason: string
  credentials: Credential[]
}

const emptyFormData: ExitFormData = {
  employee_id: 0,
  exit_type: 'sales',
  exit_date: new Date().toISOString().split('T')[0],
  sim_taken: false,
  whatsapp_logged_out: false,
  crm_mail_removed: false,
  dialer_removed: false,
  laptop_taken: false,
  sim_given_to: '',
  laptop_given_to: '',
  accessories: '',
  reason: '',
  credentials: [],
}

const emptyCredential: Credential = {
  id: Date.now(),
  label: '',
  url: '',
  username: '',
  password: '',
  notes: '',
}

export default function ExitPage() {
  const { user } = useAuth()
  const [exitRecords, setExitRecords] = useState<ExitRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [selectedRecord, setSelectedRecord] = useState<(ExitRecord & { credentials?: Credential[] }) | null>(null)
  const [formData, setFormData] = useState<ExitFormData>(emptyFormData)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [exitsResponse, employeesResponse, allEmployeesResponse] = await Promise.all([
        api.get('/exits'),
        api.get('/employees?status=active'),
        api.get('/employees')
      ])
      setExitRecords(exitsResponse.data)
      setEmployees(employeesResponse.data)
      setAllEmployees(allEmployeesResponse.data)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredRecords = useMemo(() => {
    return exitRecords.filter((record) => {
      const matchesSearch =
        searchTerm === '' ||
        record.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesType =
        typeFilter === 'all' || record.exit_type === typeFilter

      return matchesSearch && matchesType
    })
  }, [exitRecords, searchTerm, typeFilter])

  const handleOpenDialog = (record?: ExitRecord) => {
    if (record) {
      setIsEditMode(true)
      setSelectedRecord(record)
      setFormData({
        employee_id: record.employee_id,
        exit_type: record.exit_type as 'sales' | 'admin_digital' | 'hr' | 'accounts' | 'director',
        exit_date: record.exit_date?.split('T')[0] || '',
        sim_taken: record.sim_taken,
        whatsapp_logged_out: record.whatsapp_logged_out,
        crm_mail_removed: record.crm_mail_removed,
        dialer_removed: record.dialer_removed,
        laptop_taken: record.laptop_taken,
        sim_given_to: record.sim_given_to || '',
        laptop_given_to: record.laptop_given_to || '',
        accessories: record.accessories || '',
        reason: record.reason || '',
        credentials: record.credentials || [],
      })
    } else {
      setIsEditMode(false)
      setSelectedRecord(null)
      setFormData(emptyFormData)
    }
    setIsDialogOpen(true)
  }

  const handleViewRecord = async (record: ExitRecord) => {
    try {
      const response = await api.get(`/exits/${record.id}`)
      setSelectedRecord(response.data)
      setIsViewDialogOpen(true)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load exit record details')
    }
  }

  const handleEditRecord = async (record: ExitRecord) => {
    try {
      const response = await api.get(`/exits/${record.id}`)
      handleOpenDialog(response.data)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load exit record for editing')
    }
  }

  const handleDeleteClick = (record: ExitRecord) => {
    setSelectedRecord(record)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedRecord) return
    
    try {
      await api.delete(`/exits/${selectedRecord.id}`)
      toast.success('Exit record deleted successfully')
      setIsDeleteDialogOpen(false)
      setSelectedRecord(null)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete exit record')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.employee_id && !isEditMode) {
      toast.error('Please select an employee')
      return
    }
    setIsSubmitting(true)

    try {
      // Convert "none" values to empty string for API
      const submitData = {
        ...formData,
        sim_given_to: formData.sim_given_to === 'none' ? '' : formData.sim_given_to,
        laptop_given_to: formData.laptop_given_to === 'none' ? '' : formData.laptop_given_to,
      }
      
      if (isEditMode && selectedRecord) {
        await api.put(`/exits/${selectedRecord.id}`, submitData)
        toast.success('Exit record updated successfully')
      } else {
        await api.post('/exits', {
          ...submitData,
          created_by: user?.full_name || 'System',
        })
        toast.success('Exit record created successfully')
      }
      setIsDialogOpen(false)
      setIsEditMode(false)
      setSelectedRecord(null)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} exit record`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addCredential = () => {
    setFormData({
      ...formData,
      credentials: [...formData.credentials, { ...emptyCredential, id: Date.now() }],
    })
  }

  const removeCredential = (id: number) => {
    setFormData({
      ...formData,
      credentials: formData.credentials.filter((c) => c.id !== id),
    })
  }

  const updateCredential = (id: number, field: keyof Credential, value: string) => {
    setFormData({
      ...formData,
      credentials: formData.credentials.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exit Management</h1>
          <p className="text-muted-foreground">
            Process employee exits and manage handover documentation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Process Exit
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
                placeholder="Search by employee name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Exit Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="admin_digital">Admin/Digital</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="accounts">Accounts</SelectItem>
                <SelectItem value="director">Director</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Exit Records
            </CardTitle>
            <Badge variant="secondary">{filteredRecords.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <LogOut className="mb-4 h-12 w-12" />
              <p>No exit records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Exit Type</TableHead>
                    <TableHead>Exit Date</TableHead>
                    <TableHead>SIM Taken</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>CRM/Mail</TableHead>
                    <TableHead>Dialer</TableHead>
                    <TableHead>Processed By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.id}</TableCell>
                      <TableCell>{record.employee_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={record.exit_type === 'sales' ? 'default' : 'secondary'}
                          className="flex w-fit items-center gap-1"
                        >
                          {record.exit_type === 'sales' ? (
                            <Briefcase className="h-3 w-3" />
                          ) : (
                            <Monitor className="h-3 w-3" />
                          )}
                          {record.exit_type === 'sales' ? 'Sales' : 
                           record.exit_type === 'admin_digital' ? 'Admin/Digital' :
                           record.exit_type === 'hr' ? 'HR' :
                           record.exit_type === 'accounts' ? 'Accounts' :
                           record.exit_type === 'director' ? 'Director' : record.exit_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(record.exit_date)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            record.sim_taken
                              ? 'bg-success/20 text-success'
                              : 'bg-destructive/20 text-destructive'
                          }
                        >
                          {record.sim_taken ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            record.whatsapp_logged_out
                              ? 'bg-success/20 text-success'
                              : 'bg-destructive/20 text-destructive'
                          }
                        >
                          {record.whatsapp_logged_out ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            record.crm_mail_removed
                              ? 'bg-success/20 text-success'
                              : 'bg-destructive/20 text-destructive'
                          }
                        >
                          {record.crm_mail_removed ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.exit_type === 'sales' ? (
                          <Badge
                            className={
                              record.dialer_removed
                                ? 'bg-success/20 text-success'
                                : 'bg-destructive/20 text-destructive'
                            }
                          >
                            {record.dialer_removed ? 'Yes' : 'No'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>{record.created_by}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewRecord(record)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditRecord(record)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(record)}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Create/Edit Exit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) {
          setIsEditMode(false)
          setSelectedRecord(null)
        }
      }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Exit Record' : 'Process Employee Exit'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the exit details and handover information' : 'Fill in the exit details and handover information'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs
              value={formData.exit_type}
              onValueChange={(value) =>
                setFormData({ ...formData, exit_type: value as 'sales' | 'admin_digital' | 'hr' | 'accounts' | 'director' })
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="sales" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Sales
                </TabsTrigger>
                <TabsTrigger value="admin_digital" className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Admin
                </TabsTrigger>
                <TabsTrigger value="hr" className="flex items-center gap-2">
                  HR
                </TabsTrigger>
                <TabsTrigger value="accounts" className="flex items-center gap-2">
                  Accounts
                </TabsTrigger>
                <TabsTrigger value="director" className="flex items-center gap-2">
                  Director
                </TabsTrigger>
              </TabsList>

              <div className="mt-6 space-y-6">
                {/* Common Fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="employee_id">Select Employee</Label>
                    <Select
                      value={formData.employee_id?.toString() || ''}
                      onValueChange={(value) =>
                        setFormData({ ...formData, employee_id: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.full_name} - {emp.department === 'sales' ? 'Sales' : 
                           emp.department === 'admin_digital' ? 'Admin/Digital' :
                           emp.department === 'hr' ? 'HR' :
                           emp.department === 'accounts' ? 'Accounts' :
                           emp.department === 'director' ? 'Director' : emp.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exit_date">Exit Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.exit_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.exit_date ? format(new Date(formData.exit_date), "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.exit_date ? new Date(formData.exit_date) : undefined}
                        onSelect={(date) =>
                          setFormData({ ...formData, exit_date: date ? format(date, "yyyy-MM-dd") : '' })
                        }
                      />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Reason Field */}
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Exit</Label>
                  <Textarea
                    id="reason"
                    placeholder="Enter the reason for exit (e.g., Resignation, Termination, etc.)"
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                
                <Separator />

                {/* Sales Tab Content */}
                <TabsContent value="sales" className="mt-0 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>SIM Taken</Label>
                        <p className="text-sm text-muted-foreground">Was the SIM card collected?</p>
                      </div>
                      <Switch
                        checked={formData.sim_taken}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, sim_taken: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>WhatsApp Logged Out</Label>
                        <p className="text-sm text-muted-foreground">Was WhatsApp logged out?</p>
                      </div>
                      <Switch
                        checked={formData.whatsapp_logged_out}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, whatsapp_logged_out: checked })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          CRM/Mail Removed
                        </Label>
                        <p className="text-sm text-muted-foreground">Was CRM/Mail access removed?</p>
                      </div>
                      <Switch
                        checked={formData.crm_mail_removed}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, crm_mail_removed: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Dialer Removed
                        </Label>
                        <p className="text-sm text-muted-foreground">Was Dialer access removed?</p>
                      </div>
                      <Switch
                        checked={formData.dialer_removed}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, dialer_removed: checked })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sim_given_to">SIM Given To</Label>
                    <Select
                      value={formData.sim_given_to}
                      onValueChange={(value) =>
                        setFormData({ ...formData, sim_given_to: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {allEmployees.filter(e => e.status === 'active').map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accessories">Other Accessories</Label>
                    <Textarea
                      id="accessories"
                      placeholder="List any other accessories collected (e.g., ID card, keys, etc.)"
                      value={formData.accessories}
                      onChange={(e) =>
                        setFormData({ ...formData, accessories: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                </TabsContent>

                {/* Admin/Digital Tab Content */}
                <TabsContent value="admin_digital" className="mt-0 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>SIM Taken</Label>
                        <p className="text-sm text-muted-foreground">Was the SIM card collected?</p>
                      </div>
                      <Switch
                        checked={formData.sim_taken}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, sim_taken: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>WhatsApp Logged Out</Label>
                        <p className="text-sm text-muted-foreground">Was WhatsApp logged out?</p>
                      </div>
                      <Switch
                        checked={formData.whatsapp_logged_out}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, whatsapp_logged_out: checked })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          CRM/Mail Removed
                        </Label>
                        <p className="text-sm text-muted-foreground">Was CRM/Mail access removed?</p>
                      </div>
                      <Switch
                        checked={formData.crm_mail_removed}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, crm_mail_removed: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>Laptop Taken</Label>
                        <p className="text-sm text-muted-foreground">Was the laptop collected?</p>
                      </div>
                      <Switch
                        checked={formData.laptop_taken}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, laptop_taken: checked })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sim_given_to_admin">SIM Given To</Label>
                      <Select
                        value={formData.sim_given_to}
                        onValueChange={(value) =>
                          setFormData({ ...formData, sim_given_to: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allEmployees.filter(e => e.status === 'active').map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="laptop_given_to">Laptop Given To</Label>
                      <Select
                        value={formData.laptop_given_to}
                        onValueChange={(value) =>
                          setFormData({ ...formData, laptop_given_to: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allEmployees.filter(e => e.status === 'active').map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Credentials Section */}
                  <Separator className="my-4" />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Account Credentials</Label>
                        <p className="text-sm text-muted-foreground">
                          Add login details for any accounts that need to be transferred
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addCredential}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Credential
                      </Button>
                    </div>

                    {formData.credentials.map((credential, index) => (
                      <Card key={credential.id} className="relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2"
                          onClick={() => removeCredential(credential.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Key className="h-4 w-4" />
                            Credential {index + 1}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Label/Service Name</Label>
                              <Input
                                placeholder="e.g., Company Email"
                                value={credential.label}
                                onChange={(e) =>
                                  updateCredential(credential.id, 'label', e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">URL</Label>
                              <Input
                                placeholder="e.g., https://mail.company.com"
                                value={credential.url}
                                onChange={(e) =>
                                  updateCredential(credential.id, 'url', e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Username/Email</Label>
                              <Input
                                placeholder="Username"
                                value={credential.username}
                                onChange={(e) =>
                                  updateCredential(credential.id, 'username', e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Password</Label>
                              <Input
                                type="text"
                                placeholder="Password"
                                value={credential.password}
                                onChange={(e) =>
                                  updateCredential(credential.id, 'password', e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Notes</Label>
                            <Input
                              placeholder="Additional notes"
                              value={credential.notes}
                              onChange={(e) =>
                                updateCredential(credential.id, 'notes', e.target.value)
                              }
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accessories_admin">Other Accessories</Label>
                    <Textarea
                      id="accessories_admin"
                      placeholder="List any other accessories collected (e.g., ID card, keys, mouse, etc.)"
                      value={formData.accessories}
                      onChange={(e) =>
                        setFormData({ ...formData, accessories: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                </TabsContent>

                {/* HR Tab Content - Same as Admin/Digital */}
                <TabsContent value="hr" className="mt-0 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>SIM Taken</Label>
                        <p className="text-sm text-muted-foreground">Was the SIM card collected?</p>
                      </div>
                      <Switch
                        checked={formData.sim_taken}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, sim_taken: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>WhatsApp Logged Out</Label>
                        <p className="text-sm text-muted-foreground">Was WhatsApp logged out?</p>
                      </div>
                      <Switch
                        checked={formData.whatsapp_logged_out}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, whatsapp_logged_out: checked })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          CRM/Mail Removed
                        </Label>
                        <p className="text-sm text-muted-foreground">Was CRM/Mail access removed?</p>
                      </div>
                      <Switch
                        checked={formData.crm_mail_removed}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, crm_mail_removed: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>Laptop Taken</Label>
                        <p className="text-sm text-muted-foreground">Was the laptop collected?</p>
                      </div>
                      <Switch
                        checked={formData.laptop_taken}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, laptop_taken: checked })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>SIM Given To</Label>
                      <Select
                        value={formData.sim_given_to}
                        onValueChange={(value) =>
                          setFormData({ ...formData, sim_given_to: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allEmployees.filter(e => e.status === 'active').map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Laptop Given To</Label>
                      <Select
                        value={formData.laptop_given_to}
                        onValueChange={(value) =>
                          setFormData({ ...formData, laptop_given_to: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allEmployees.filter(e => e.status === 'active').map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Other Accessories</Label>
                    <Textarea
                      placeholder="List any other accessories collected (e.g., ID card, keys, mouse, etc.)"
                      value={formData.accessories}
                      onChange={(e) =>
                        setFormData({ ...formData, accessories: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                </TabsContent>

                {/* Accounts Tab Content - Same as Admin/Digital */}
                <TabsContent value="accounts" className="mt-0 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>SIM Taken</Label>
                        <p className="text-sm text-muted-foreground">Was the SIM card collected?</p>
                      </div>
                      <Switch
                        checked={formData.sim_taken}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, sim_taken: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>WhatsApp Logged Out</Label>
                        <p className="text-sm text-muted-foreground">Was WhatsApp logged out?</p>
                      </div>
                      <Switch
                        checked={formData.whatsapp_logged_out}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, whatsapp_logged_out: checked })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          CRM/Mail Removed
                        </Label>
                        <p className="text-sm text-muted-foreground">Was CRM/Mail access removed?</p>
                      </div>
                      <Switch
                        checked={formData.crm_mail_removed}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, crm_mail_removed: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>Laptop Taken</Label>
                        <p className="text-sm text-muted-foreground">Was the laptop collected?</p>
                      </div>
                      <Switch
                        checked={formData.laptop_taken}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, laptop_taken: checked })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>SIM Given To</Label>
                      <Select
                        value={formData.sim_given_to}
                        onValueChange={(value) =>
                          setFormData({ ...formData, sim_given_to: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allEmployees.filter(e => e.status === 'active').map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Laptop Given To</Label>
                      <Select
                        value={formData.laptop_given_to}
                        onValueChange={(value) =>
                          setFormData({ ...formData, laptop_given_to: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allEmployees.filter(e => e.status === 'active').map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Other Accessories</Label>
                    <Textarea
                      placeholder="List any other accessories collected (e.g., ID card, keys, mouse, etc.)"
                      value={formData.accessories}
                      onChange={(e) =>
                        setFormData({ ...formData, accessories: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                </TabsContent>

                {/* Director Tab Content - Same as Admin/Digital */}
                <TabsContent value="director" className="mt-0 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>SIM Taken</Label>
                        <p className="text-sm text-muted-foreground">Was the SIM card collected?</p>
                      </div>
                      <Switch
                        checked={formData.sim_taken}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, sim_taken: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>WhatsApp Logged Out</Label>
                        <p className="text-sm text-muted-foreground">Was WhatsApp logged out?</p>
                      </div>
                      <Switch
                        checked={formData.whatsapp_logged_out}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, whatsapp_logged_out: checked })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          CRM/Mail Removed
                        </Label>
                        <p className="text-sm text-muted-foreground">Was CRM/Mail access removed?</p>
                      </div>
                      <Switch
                        checked={formData.crm_mail_removed}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, crm_mail_removed: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>Laptop Taken</Label>
                        <p className="text-sm text-muted-foreground">Was the laptop collected?</p>
                      </div>
                      <Switch
                        checked={formData.laptop_taken}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, laptop_taken: checked })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>SIM Given To</Label>
                      <Select
                        value={formData.sim_given_to}
                        onValueChange={(value) =>
                          setFormData({ ...formData, sim_given_to: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allEmployees.filter(e => e.status === 'active').map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Laptop Given To</Label>
                      <Select
                        value={formData.laptop_given_to}
                        onValueChange={(value) =>
                          setFormData({ ...formData, laptop_given_to: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allEmployees.filter(e => e.status === 'active').map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Other Accessories</Label>
                    <Textarea
                      placeholder="List any other accessories collected (e.g., ID card, keys, mouse, etc.)"
                      value={formData.accessories}
                      onChange={(e) =>
                        setFormData({ ...formData, accessories: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="mt-6">
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
                    {isEditMode ? 'Updating...' : 'Processing...'}
                  </>
                ) : (
                  isEditMode ? 'Update Exit Record' : 'Process Exit'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Exit Record Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exit Record Details</DialogTitle>
            <DialogDescription>
              View complete exit information for {selectedRecord?.employee_name}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Employee</Label>
                  <p className="font-medium">{selectedRecord.employee_name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Exit Type</Label>
                  <Badge
                    variant={selectedRecord.exit_type === 'sales' ? 'default' : 'secondary'}
                  >
                    {selectedRecord.exit_type === 'sales' ? 'Sales' : 
                           selectedRecord.exit_type === 'admin_digital' ? 'Admin/Digital' :
                           selectedRecord.exit_type === 'hr' ? 'HR' :
                           selectedRecord.exit_type === 'accounts' ? 'Accounts' :
                           selectedRecord.exit_type === 'director' ? 'Director' : selectedRecord.exit_type}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Exit Date</Label>
                  <p className="font-medium">{formatDate(selectedRecord.exit_date)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Processed By</Label>
                  <p className="font-medium">{selectedRecord.created_by}</p>
                </div>
              </div>

              <Separator />

              {/* Handover Status */}
              <div className="space-y-3">
                <Label className="text-base">Handover Status</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span>SIM Taken</span>
                    <Badge
                      className={
                        selectedRecord.sim_taken
                          ? 'bg-success/20 text-success'
                          : 'bg-destructive/20 text-destructive'
                      }
                    >
                      {selectedRecord.sim_taken ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span>WhatsApp Logged Out</span>
                    <Badge
                      className={
                        selectedRecord.whatsapp_logged_out
                          ? 'bg-success/20 text-success'
                          : 'bg-destructive/20 text-destructive'
                      }
                    >
                      {selectedRecord.whatsapp_logged_out ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      CRM/Mail Removed
                    </span>
                    <Badge
                      className={
                        selectedRecord.crm_mail_removed
                          ? 'bg-success/20 text-success'
                          : 'bg-destructive/20 text-destructive'
                      }
                    >
                      {selectedRecord.crm_mail_removed ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  {selectedRecord.exit_type === 'sales' && (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Dialer Removed
                      </span>
                      <Badge
                        className={
                          selectedRecord.dialer_removed
                            ? 'bg-success/20 text-success'
                            : 'bg-destructive/20 text-destructive'
                        }
                      >
                        {selectedRecord.dialer_removed ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  )}
                  {selectedRecord.exit_type === 'admin_digital' && (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span>Laptop Taken</span>
                      <Badge
                        className={
                          selectedRecord.laptop_taken
                            ? 'bg-success/20 text-success'
                            : 'bg-destructive/20 text-destructive'
                        }
                      >
                        {selectedRecord.laptop_taken ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

  {/* Reason */}
  {selectedRecord.reason && (
    <>
      <Separator />
      <div className="space-y-2">
        <Label className="text-base">Reason for Exit</Label>
        <p className="text-sm">{selectedRecord.reason}</p>
      </div>
    </>
  )}

              {/* Assignment Info */}
              {(selectedRecord.sim_given_to_name || selectedRecord.laptop_given_to_name) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-base">Assignment Info</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedRecord.sim_given_to_name && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">SIM Given To</Label>
                          <p className="font-medium">{selectedRecord.sim_given_to_name}</p>
                        </div>
                      )}
                      {selectedRecord.laptop_given_to_name && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Laptop Given To</Label>
                          <p className="font-medium">{selectedRecord.laptop_given_to_name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Credentials (Admin/Digital only) */}
              {selectedRecord.exit_type === 'admin_digital' &&
                selectedRecord.credentials &&
                selectedRecord.credentials.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-base">Saved Credentials</Label>
                      <div className="space-y-3">
                        {selectedRecord.credentials.map((cred, index) => (
                          <Card key={index}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Key className="h-4 w-4" />
                                <span className="font-medium">{cred.label || `Credential ${index + 1}`}</span>
                              </div>
                              <div className="grid gap-2 text-sm">
                                {cred.url && (
                                  <div>
                                    <span className="text-muted-foreground">URL: </span>
                                    {cred.url}
                                  </div>
                                )}
                                <div>
                                  <span className="text-muted-foreground">Username: </span>
                                  {cred.username}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Password: </span>
                                  {cred.password}
                                </div>
                                {cred.notes && (
                                  <div>
                                    <span className="text-muted-foreground">Notes: </span>
                                    {cred.notes}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                )}

              {/* Accessories */}
              {selectedRecord.accessories && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-base">Accessories Collected</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedRecord.accessories}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the exit record for{' '}
              <strong>{selectedRecord?.employee_name}</strong>. The employee status will be
              reverted to active. This action cannot be undone.
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
        type="exits"
        onSuccess={fetchData}
      />
    </div>
  )
}
