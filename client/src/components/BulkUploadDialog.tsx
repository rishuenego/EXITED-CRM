import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import api from '@/lib/api'

interface BulkUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'employees' | 'sims' | 'exits'
  onSuccess: () => void
}

interface ParsedRow {
  data: Record<string, string>
  isValid: boolean
  errors: string[]
}

interface UploadResult {
  success: number
  failed: number
  errors: { row: number; error: string }[]
}

const EMPLOYEE_COLUMNS = ['employee_id', 'full_name', 'email', 'phone', 'department', 'designation', 'joining_date']
const SIM_COLUMNS = ['sim_number', 'employee_name', 'status', 'assigned_date', 'notes']
const EXIT_COLUMNS = ['employee_name', 'exit_date', 'department', 'reason']

export default function BulkUploadDialog({ open, onOpenChange, type, onSuccess }: BulkUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const columns = type === 'employees' ? EMPLOYEE_COLUMNS : type === 'sims' ? SIM_COLUMNS : EXIT_COLUMNS

  const downloadSampleCSV = () => {
    let headers: string
    let sampleRow: string

    if (type === 'employees') {
      headers = 'employee_id,full_name,email,phone,department,designation,joining_date'
      sampleRow = 'EMP001,John Doe,john@example.com,9876543210,sales,Manager,2024-01-15'
    } else if (type === 'sims') {
      headers = 'sim_number,employee_name,status,assigned_date,notes'
      sampleRow = '1234567890,John Doe,active,2024-01-15,Company SIM'
    } else {
      headers = 'employee_name,exit_date,department,reason'
      sampleRow = 'John Doe,2024-01-15,sales,Resignation'
    }

    const csvContent = `${headers}\n${sampleRow}`
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sample_${type}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const data: Record<string, string> = {}
      const errors: string[] = []

      headers.forEach((header, index) => {
        data[header] = values[index] || ''
      })

      // Validate required fields
      if (type === 'employees') {
        if (!data.full_name) errors.push('Full name is required')
        if (!data.department) errors.push('Department is required')
        if (data.department && !['sales', 'admin_digital', 'hr', 'accounts', 'director'].includes(data.department.toLowerCase())) {
          errors.push('Department must be "sales", "admin_digital", "hr", "accounts", or "director"')
        }
      } else if (type === 'sims') {
        if (!data.sim_number) errors.push('SIM number is required')
        if (data.status && !['active', 'inactive', 'returned'].includes(data.status.toLowerCase())) {
          errors.push('Status must be "active", "inactive", or "returned"')
        }
      } else {
        if (!data.employee_name) errors.push('Employee name is required')
        if (!data.exit_date) errors.push('Exit date is required')
      }

      return {
        data,
        isValid: errors.length === 0,
        errors
      }
    }).filter(row => Object.values(row.data).some(v => v !== ''))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    setFile(selectedFile)
    setUploadResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const parsed = parseCSV(text)
      setParsedData(parsed)
    }
    reader.readAsText(selectedFile)
  }

  const handleUpload = async () => {
    if (parsedData.length === 0) {
      toast.error('No data to upload')
      return
    }

    const validRows = parsedData.filter(row => row.isValid)
    if (validRows.length === 0) {
      toast.error('No valid rows to upload. Please fix the errors.')
      return
    }

    setIsUploading(true)
    try {
      const response = await api.post(`/${type}/bulk`, {
        data: validRows.map(row => row.data)
      })
      
      setUploadResult(response.data)
      
      if (response.data.success > 0) {
        toast.success(`Successfully uploaded ${response.data.success} records`)
        onSuccess()
      }
      
      if (response.data.failed > 0) {
        toast.error(`Failed to upload ${response.data.failed} records`)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload data')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setParsedData([])
    setUploadResult(null)
    onOpenChange(false)
  }

  const validCount = parsedData.filter(r => r.isValid).length
  const invalidCount = parsedData.filter(r => !r.isValid).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Upload {type === 'employees' ? 'Employees' : type === 'sims' ? 'SIM Cards' : 'Exit Records'}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to add multiple records at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Download Sample */}
          <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/50">
            <div className="space-y-1">
              <p className="font-medium">Download Sample CSV</p>
              <p className="text-sm text-muted-foreground">
                Use this template to format your data correctly
              </p>
            </div>
            <Button variant="outline" onClick={downloadSampleCSV}>
              <Download className="mr-2 h-4 w-4" />
              Download Sample
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload CSV File</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
              >
                <Upload className="mr-2 h-4 w-4" />
                Browse
              </Button>
            </div>
          </div>

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <p className="font-medium">Preview ({parsedData.length} rows)</p>
                <Badge variant="default" className="bg-success/20 text-success">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="bg-destructive/20 text-destructive">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {invalidCount} invalid
                  </Badge>
                )}
              </div>

              <div className="max-h-64 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Status</TableHead>
                      {columns.map(col => (
                        <TableHead key={col} className="capitalize">
                          {col.replace(/_/g, ' ')}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, index) => (
                      <TableRow key={index} className={!row.isValid ? 'bg-destructive/10' : ''}>
                        <TableCell>
                          {row.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <span title={row.errors.join(', ')}>
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            </span>
                          )}
                        </TableCell>
                        {columns.map(col => (
                          <TableCell key={col} className="max-w-32 truncate">
                            {row.data[col] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedData.length > 10 && (
                <p className="text-sm text-muted-foreground">
                  Showing first 10 of {parsedData.length} rows
                </p>
              )}
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className="rounded-lg border p-4 space-y-2">
              <p className="font-medium">Upload Results</p>
              <div className="flex gap-4">
                <Badge className="bg-success/20 text-success">
                  {uploadResult.success} successful
                </Badge>
                <Badge className="bg-destructive/20 text-destructive">
                  {uploadResult.failed} failed
                </Badge>
              </div>
              {uploadResult.errors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-auto text-sm">
                  {uploadResult.errors.map((err, i) => (
                    <p key={i} className="text-destructive">
                      Row {err.row}: {err.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isUploading || validCount === 0}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {validCount} Records
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
