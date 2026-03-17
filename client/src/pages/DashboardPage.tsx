import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts'
import { Users, Smartphone, LogOut, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface DashboardStats {
  stats: {
    totalEmployees: number
    activeEmployees: number
    exitedEmployees: number
    totalSims: number
    activeSims: number
    inactiveSims: number
    returnedSims: number
    totalExits: number
    salesExits: number
    adminDigitalExits: number
  }
  monthlyData: Array<{
    month: string
    count: number
    sales: number
    admin_digital: number
  }>
  departmentData: Array<{
    name: string
    count: number
    active: number
    exited: number
  }>
  recentExits: Array<{
    id: number
    employee_name: string
    exit_type: string
    exit_date: string
  }>
  simStatusData: Array<{
    status: string
    count: number
  }>
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null)
  const [timeFilter, setTimeFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [timeFilter])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const response = await api.get('/dashboard/stats')
      setDashboardData(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const COLORS = ['oklch(0.65 0.22 290)', 'oklch(0.60 0.18 200)', 'oklch(0.70 0.15 150)', 'oklch(0.65 0.20 50)']

  const stats = dashboardData?.stats || {
    totalEmployees: 0,
    activeEmployees: 0,
    exitedEmployees: 0,
    totalSims: 0,
    activeSims: 0,
    inactiveSims: 0,
    returnedSims: 0,
    totalExits: 0,
    salesExits: 0,
    adminDigitalExits: 0,
  }

  const statCards = [
    {
      title: 'Active Employees',
      value: stats.activeEmployees,
      total: stats.totalEmployees,
      icon: Users,
      trend: '+12%',
      trendUp: true,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Exited Employees',
      value: stats.exitedEmployees,
      total: stats.totalEmployees,
      icon: LogOut,
      trend: '-5%',
      trendUp: false,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'Active SIM Cards',
      value: stats.activeSims,
      total: stats.totalSims,
      icon: Smartphone,
      trend: '+3%',
      trendUp: true,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Returned SIMs',
      value: stats.returnedSims,
      subtitle: `Total SIMs: ${stats.totalSims}`,
      icon: TrendingUp,
      trend: '+8%',
      trendUp: true,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ]

  // Prepare chart data
  const monthlyChartData = dashboardData?.monthlyData?.map(item => ({
    month: item.month,
    active: item.count - item.sales - item.admin_digital,
    exited: item.sales + item.admin_digital,
  })) || []

  const departmentChartData = dashboardData?.departmentData?.map(item => ({
    name: item.name === 'sales' ? 'Sales' : 'Admin/Digital',
    value: item.count,
  })) || []

  const simProviderData = dashboardData?.simStatusData?.map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
  })) || []

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of employee and exit management data
          </p>
        </div>
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  {card.total && (
                    <p className="text-xs text-muted-foreground">
                      of {card.total} total
                    </p>
                  )}
                  {card.subtitle && (
                    <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  )}
                </div>
                <div className={`rounded-lg p-3 ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs">
                {card.trendUp ? (
                  <ArrowUpRight className="h-3 w-3 text-success" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-destructive" />
                )}
                <span className={card.trendUp ? 'text-success' : 'text-destructive'}>
                  {card.trend}
                </span>
                <span className="text-muted-foreground">from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Exit Trends Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Trends</CardTitle>
            <CardDescription>Active vs exited employees over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData}>
                  <defs>
                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.22 290)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.65 0.22 290)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExited" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.55 0.22 25)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.55 0.22 25)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.03 285)" />
                  <XAxis dataKey="month" stroke="oklch(0.65 0.02 285)" fontSize={12} />
                  <YAxis stroke="oklch(0.65 0.02 285)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.16 0.02 285)',
                      border: '1px solid oklch(0.28 0.03 285)',
                      borderRadius: '8px',
                      color: 'oklch(0.97 0.01 285)',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="active"
                    name="Active"
                    stroke="oklch(0.65 0.22 290)"
                    fill="url(#colorActive)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="exited"
                    name="Exited"
                    stroke="oklch(0.55 0.22 25)"
                    fill="url(#colorExited)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* SIM Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>SIM Status Distribution</CardTitle>
            <CardDescription>Distribution of SIM cards by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={simProviderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {simProviderData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.16 0.02 285)',
                      border: '1px solid oklch(0.28 0.03 285)',
                      borderRadius: '8px',
                      color: 'oklch(0.97 0.01 285)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Department Distribution</CardTitle>
            <CardDescription>Employees by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.03 285)" />
                  <XAxis dataKey="name" stroke="oklch(0.65 0.02 285)" fontSize={12} />
                  <YAxis stroke="oklch(0.65 0.02 285)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.16 0.02 285)',
                      border: '1px solid oklch(0.28 0.03 285)',
                      borderRadius: '8px',
                      color: 'oklch(0.97 0.01 285)',
                    }}
                  />
                  <Bar dataKey="value" name="Employees" fill="oklch(0.65 0.22 290)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Exits */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Exits</CardTitle>
            <CardDescription>Latest employee exit records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(dashboardData?.recentExits || []).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No recent exits</p>
              ) : (
                (dashboardData?.recentExits || []).map((exit) => (
                  <div
                    key={exit.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{exit.employee_name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{exit.exit_type.replace('_', '/')}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={exit.exit_type === 'sales' ? 'default' : 'secondary'}
                      >
                        {exit.exit_type === 'sales' ? 'Sales' : 'Admin/Digital'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(exit.exit_date)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
