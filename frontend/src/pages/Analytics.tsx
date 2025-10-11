import { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  FileText, 
  Truck,
  AlertTriangle,
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { apiService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { cn } from '@/utils/cn';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  const { data: statsData, isLoading: statsLoading, refetch } = useQuery(
    ['analytics-stats', timeRange],
    () => apiService.getReportStatistics(),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const { data: reportsData, isLoading: reportsLoading } = useQuery(
    ['analytics-reports', timeRange],
    () => apiService.getReports({ limit: 100 })
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const stats = statsData?.data?.overview;
  const reports = reportsData?.data?.reports || [];

  // Calculate analytics data
  const wasteTypeDistribution = reports.reduce((acc: any, report: any) => {
    acc[report.wasteType] = (acc[report.wasteType] || 0) + 1;
    return acc;
  }, {});

  const urgencyDistribution = reports.reduce((acc: any, report: any) => {
    acc[report.urgency] = (acc[report.urgency] || 0) + 1;
    return acc;
  }, {});

  const statusDistribution = reports.reduce((acc: any, report: any) => {
    acc[report.status] = (acc[report.status] || 0) + 1;
    return acc;
  }, {});

  // Mock trend data (in real app, this would come from backend)
  const trendData = [
    { period: 'Week 1', reports: 12, completed: 8 },
    { period: 'Week 2', reports: 18, completed: 15 },
    { period: 'Week 3', reports: 24, completed: 20 },
    { period: 'Week 4', reports: 30, completed: 25 },
  ];

  const getWasteTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      plastic: 'bg-blue-500',
      organic: 'bg-green-500',
      paper: 'bg-yellow-500',
      glass: 'bg-purple-500',
      metal: 'bg-gray-500',
      electronic: 'bg-red-500',
    };
    return colors[type] || 'bg-gray-400';
  };

  const getUrgencyColor = (urgency: string) => {
    const colors: { [key: string]: string } = {
      low: 'bg-green-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      critical: 'bg-red-500',
    };
    return colors[urgency] || 'bg-gray-400';
  };

  if (statsLoading || reportsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive insights and performance metrics
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-outline"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
            Refresh
          </button>
          <button className="btn btn-primary">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reports</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalReports}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+12% from last month</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalReports > 0 
                    ? Math.round((stats.resolvedReports / stats.totalReports) * 100)
                    : 0}%
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+5% from last month</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Collectors</p>
                <p className="text-3xl font-bold text-gray-900">8</p>
                <div className="flex items-center mt-2">
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">-2 from last month</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Truck className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Reports</p>
                <p className="text-3xl font-bold text-red-600">{stats.criticalReports}</p>
                <div className="flex items-center mt-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">Needs attention</span>
                </div>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waste Type Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Waste Type Distribution</h3>
            <Filter className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {Object.entries(wasteTypeDistribution).map(([type, count]) => {
              const percentage = Math.round((count as number / reports.length) * 100);
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn('w-4 h-4 rounded', getWasteTypeColor(type))}></div>
                    <span className="text-sm font-medium text-gray-900 capitalize">{type}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full', getWasteTypeColor(type))}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8">{String(count)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Urgency Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Urgency Levels</h3>
            <AlertTriangle className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {Object.entries(urgencyDistribution).map(([urgency, count]) => {
              const percentage = Math.round((count as number / reports.length) * 100);
              return (
                <div key={urgency} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn('w-4 h-4 rounded', getUrgencyColor(urgency))}></div>
                    <span className="text-sm font-medium text-gray-900 capitalize">{urgency}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full', getUrgencyColor(urgency))}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8">{String(count)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trends and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Trends */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Report Trends</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {trendData.map((data, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-900">{data.period}</span>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Reports</p>
                    <p className="text-lg font-bold text-blue-600">{data.reports}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-lg font-bold text-green-600">{data.completed}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Rate</p>
                    <p className="text-lg font-bold text-gray-900">
                      {Math.round((data.completed / data.reports) * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Status Overview</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {Object.entries(statusDistribution).map(([status, count]) => {
              const percentage = Math.round((count as number / reports.length) * 100);
              const statusColors: { [key: string]: string } = {
                pending: 'text-yellow-600 bg-yellow-100',
                assigned: 'text-blue-600 bg-blue-100',
                in_progress: 'text-purple-600 bg-purple-100',
                collected: 'text-green-600 bg-green-100',
                resolved: 'text-gray-600 bg-gray-100',
              };
              
              return (
                <div key={status} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium capitalize',
                      statusColors[status] || 'text-gray-600 bg-gray-100'
                    )}>
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{String(count)}</p>
                    <p className="text-xs text-gray-500">{percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
          <Users className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-blue-50 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="text-2xl font-bold text-gray-900">
              {Math.round(reports.length / 30)} {/* Average per day */}
            </h4>
            <p className="text-sm text-gray-600">Avg Reports/Day</p>
          </div>
          
          <div className="text-center p-6 bg-green-50 rounded-lg">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="text-2xl font-bold text-gray-900">2.5h</h4>
            <p className="text-sm text-gray-600">Avg Response Time</p>
          </div>
          
          <div className="text-center p-6 bg-purple-50 rounded-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="text-2xl font-bold text-gray-900">95%</h4>
            <p className="text-sm text-gray-600">Collector Efficiency</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
