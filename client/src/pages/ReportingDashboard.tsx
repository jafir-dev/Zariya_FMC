import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  LineChart,
  Line,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Building,
  Wrench,
  Calendar
} from 'lucide-react';
import Layout from '@/components/Layout';
import { format, subDays, subMonths } from 'date-fns';

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  avgResolutionTime: number;
  activeTechnicians: number;
  totalBuildings: number;
  urgentRequests: number;
  overdueRequests: number;
}

interface ChartData {
  name: string;
  value: number;
  fill?: string;
}

interface TimelineData {
  date: string;
  requests: number;
  completed: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ReportingDashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('30');
  const [selectedBuilding, setSelectedBuilding] = useState('all');

  // Mock data for analytics - in real app this would come from API
  const mockStats: DashboardStats = {
    totalRequests: 156,
    pendingRequests: 23,
    completedRequests: 133,
    avgResolutionTime: 2.3,
    activeTechnicians: 12,
    totalBuildings: 8,
    urgentRequests: 5,
    overdueRequests: 3,
  };

  const categoryData: ChartData[] = [
    { name: 'HVAC', value: 35, fill: COLORS[0] },
    { name: 'Plumbing', value: 28, fill: COLORS[1] },
    { name: 'Electrical', value: 22, fill: COLORS[2] },
    { name: 'General', value: 18, fill: COLORS[3] },
    { name: 'Other', value: 12, fill: COLORS[4] },
  ];

  const priorityData: ChartData[] = [
    { name: 'Low', value: 45 },
    { name: 'Medium', value: 78 },
    { name: 'High', value: 28 },
    { name: 'Urgent', value: 5 },
  ];

  const timelineData: TimelineData[] = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    return {
      date: format(date, 'MMM dd'),
      requests: Math.floor(Math.random() * 10) + 2,
      completed: Math.floor(Math.random() * 8) + 1,
    };
  });

  const technicianPerformance = [
    { name: 'John Smith', completed: 23, rating: 4.8 },
    { name: 'Sarah Johnson', completed: 19, rating: 4.9 },
    { name: 'Mike Wilson', completed: 17, rating: 4.7 },
    { name: 'Lisa Brown', completed: 15, rating: 4.6 },
    { name: 'Tom Davis', completed: 12, rating: 4.5 },
  ];

  // Check if user has access to reporting
  if (!user || !['admin', 'fmc_head', 'fmc_supervisor'].includes(user.role)) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access reporting dashboard.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Analytics & Reports</h1>
              <p className="text-muted-foreground mt-2">Performance insights and operational metrics</p>
            </div>
            <div className="flex space-x-4 mt-4 sm:mt-0">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  <SelectItem value="building1">Skyline Towers</SelectItem>
                  <SelectItem value="building2">Business Park</SelectItem>
                  <SelectItem value="building3">Garden View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                  <p className="text-3xl font-bold text-foreground">{mockStats.totalRequests}</p>
                  <p className="text-xs text-green-600 mt-1">+12% from last month</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Resolution</p>
                  <p className="text-3xl font-bold text-foreground">{mockStats.avgResolutionTime}h</p>
                  <p className="text-xs text-green-600 mt-1">-15% faster</p>
                </div>
                <Clock className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-3xl font-bold text-foreground">
                    {Math.round((mockStats.completedRequests / mockStats.totalRequests) * 100)}%
                  </p>
                  <p className="text-xs text-green-600 mt-1">Above target</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Urgent Requests</p>
                  <p className="text-3xl font-bold text-foreground">{mockStats.urgentRequests}</p>
                  <p className="text-xs text-orange-600 mt-1">Needs attention</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Request Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Request Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="#8884d8" 
                    name="New Requests"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#82ca9d" 
                    name="Completed"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wrench className="w-5 h-5" />
                <span>Request Categories</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Priority Distribution & Technician Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Priority Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Technician Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Top Performing Technicians</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {technicianPerformance.map((tech, index) => (
                  <div key={tech.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{tech.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {tech.completed} requests completed
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium">{tech.rating}</span>
                        <span className="text-yellow-500">★</span>
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>Buildings Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Buildings</span>
                  <span className="font-semibold">{mockStats.totalBuildings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Requests/Building</span>
                  <span className="font-semibold">
                    {Math.round(mockStats.totalRequests / mockStats.totalBuildings)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Most Active</span>
                  <Badge variant="secondary">Skyline Towers</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Team Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Technicians</span>
                  <span className="font-semibold">{mockStats.activeTechnicians}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Load/Technician</span>
                  <span className="font-semibold">
                    {Math.round(mockStats.pendingRequests / mockStats.activeTechnicians)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Team Rating</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-semibold">4.7</span>
                    <span className="text-yellow-500">★</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Action Required</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Overdue Requests</span>
                  <Badge variant="destructive">{mockStats.overdueRequests}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Urgent Pending</span>
                  <Badge variant="destructive">{mockStats.urgentRequests}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Needs Review</span>
                  <Badge variant="secondary">7</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}