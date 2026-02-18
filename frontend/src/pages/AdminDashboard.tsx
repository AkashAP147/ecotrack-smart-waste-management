import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Filter,
  UserPlus,
  Settings,
  Truck,
  Eye,
  UserCheck
} from 'lucide-react';
import { apiService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';

const AdminDashboard = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [assignmentMode, setAssignmentMode] = useState<'manual' | 'auto' | 'scheduled'>('manual');
  const [showScheduledModal, setShowScheduledModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [scheduledSettings, setScheduledSettings] = useState({
    scheduledTime: '',
    scheduledDate: '',
    prioritizeProximity: true,
    balanceWorkload: true,
    considerUrgency: true,
    maxAssignmentsPerCollector: 5,
  });
  const [autoAssignSettings, setAutoAssignSettings] = useState({
    prioritizeProximity: true,
    balanceWorkload: true,
    considerUrgency: true,
    maxAssignmentsPerCollector: 5,
  });
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: statsData, isLoading: statsLoading } = useQuery(
    'admin-statistics',
    () => apiService.getReportStatistics()
  );

  const { data: reportsData, isLoading: reportsLoading } = useQuery(
    ['admin-reports', statusFilter, urgencyFilter],
    () => apiService.getReports({
      status: statusFilter || undefined,
      urgency: urgencyFilter || undefined,
      limit: 20,
    } as any)
  );

  const { data: collectorsData, isLoading: collectorsLoading } = useQuery(
    'collectors',
    () => apiService.getCollectors(1, 10)
  );

  const assignCollectorMutation = useMutation(
    ({ reportId, collectorId }: { reportId: string; collectorId: string }) =>
      apiService.assignCollectorToReport(reportId, collectorId),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['admin-reports']);
        setShowAssignModal(false);
        setSelectedReport(null);
        // Show success message
        alert(`Successfully assigned report to collector!`);
      },
      onError: (error: any) => {
        console.error('Assignment error:', error);
        alert(`Assignment failed: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const autoAssignMutation = useMutation(
    (settings: any) => apiService.autoAssignReports(settings),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['admin-reports']);
        setShowAutoAssignModal(false);
        // Show success message with assignment count
        alert(`Successfully auto-assigned ${data.data.assignedCount} reports!`);
      },
      onError: (error: any) => {
        alert(`Auto-assignment failed: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  const stats = statsData?.data?.overview;
  const reports = reportsData?.data?.reports || [];
  const collectors = (collectorsData as any)?.data?.collectors || [];

  const handleAssignCollector = (report: any) => {
    setSelectedReport(report);
    setShowAssignModal(true);
  };

  const handleAssignSubmit = (collectorId: string) => {
    if (selectedReport) {
      assignCollectorMutation.mutate({
        reportId: selectedReport._id,
        collectorId,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'status-pending',
      assigned: 'status-assigned',
      in_progress: 'status-in-progress',
      collected: 'status-collected',
      resolved: 'status-resolved',
      cancelled: 'status-cancelled',
    };
    return badges[status as keyof typeof badges] || 'badge-secondary';
  };

  const getUrgencyBadge = (urgency: string) => {
    const badges = {
      low: 'urgency-low',
      medium: 'urgency-medium',
      high: 'urgency-high',
      critical: 'urgency-critical',
    };
    return badges[urgency as keyof typeof badges] || 'badge-secondary';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Monitor and manage waste collection operations
        </p>
      </div>

      {/* Statistics Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="card-body flex justify-center">
                <LoadingSpinner />
              </div>
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Reports</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.totalReports}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    +12% from last month
                  </p>
                </div>
                <FileText className="w-12 h-12 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {stats.pendingReports}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Need assignment
                  </p>
                </div>
                <Clock className="w-12 h-12 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.assignedReports + stats.inProgressReports}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Being collected
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical</p>
                  <p className="text-3xl font-bold text-red-600">
                    {stats.criticalReports}
                  </p>
                  <p className="text-sm text-red-500 mt-1">
                    Urgent attention
                  </p>
                </div>
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              {/* Enhanced Assign Collectors with dropdown */}
              <div className="relative group">
                <button 
                  onClick={() => setShowAssignModal(true)}
                  className="btn btn-primary w-full flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign Collectors
                  </div>
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center"
                    >
                      <UserPlus className="w-4 h-4 mr-2 text-blue-600" />
                      Manual Assignment
                    </button>
                    <button
                      onClick={() => setShowAutoAssignModal(true)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Auto Assignment
                    </button>
                    <button
                      onClick={() => {
                        setAssignmentMode('scheduled');
                        setShowScheduledModal(true);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center"
                    >
                      <Clock className="w-4 h-4 mr-2 text-purple-600" />
                      Schedule Assignment
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => navigate('/admin/reports')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-2 text-gray-600" />
                      View All Reports
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => navigate('/admin/reports')}
                className="btn btn-outline w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                View All Reports
              </button>
              <button 
                onClick={() => navigate('/admin/users')}
                className="btn btn-outline w-full"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Users
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Active Collectors
            </h3>
            {collectorsLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-2">
                {collectors.slice(0, 3).map((collector: any) => (
                  <div key={collector._id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{collector.name}</p>
                      <p className="text-sm text-gray-600">
                        {collector.statistics?.pendingReports || 0} pending
                      </p>
                    </div>
                    <span className={`badge ${collector.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {collector.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  View all collectors →
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              System Health
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">API Status</span>
                <span className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Healthy
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database</span>
                <span className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">ML Service</span>
                <span className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Running
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Reports
            </h2>
            <div className="flex items-center space-x-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-select text-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="collected">Collected</option>
              </select>
              
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="form-select text-sm"
              >
                <option value="">All Urgency</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card-body">
          {reportsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No reports found with current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Urgency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Collector
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report: any) => (
                    <tr key={report._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {report.description.substring(0, 50)}...
                          </p>
                          <p className="text-sm text-gray-500">
                            {report.wasteType}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getStatusBadge(report.status)}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getUrgencyBadge(report.urgency)}`}>
                          {report.urgency}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-1" />
                          {report.address || 'No address'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.assignedTo?.name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(report.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-primary-600 hover:text-primary-900 mr-3" onClick={() => handleViewReport(report)}>
                          <Eye className="w-4 h-4" />
                        </button>
                              {/* Report Details Modal */}
                              {showReportModal && selectedReport && (
                                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
                                  <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                                    <div className="mt-3">
                                      <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-medium text-gray-900">Report Details</h3>
                                        <button
                                          onClick={() => setShowReportModal(false)}
                                          className="text-gray-400 hover:text-gray-600"
                                        >
                                          ×
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700">Description</label>
                                            <p className="mt-1 text-sm text-gray-900">{selectedReport.description}</p>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700">Waste Type</label>
                                              <p className="mt-1 text-sm text-gray-900 capitalize">{selectedReport.wasteType}</p>
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700">Urgency</label>
                                              <p className={`mt-1 text-sm font-medium capitalize ${getUrgencyBadge(selectedReport.urgency)}`}>{selectedReport.urgency}</p>
                                            </div>
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700">Status</label>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusBadge(selectedReport.status)}`}>
                                              {selectedReport.status.replace('_', ' ')}
                                            </span>
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700">Location</label>
                                            <p className="mt-1 text-sm text-gray-900">{selectedReport.address}</p>
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700">Reported By</label>
                                            <p className="mt-1 text-sm text-gray-900">{selectedReport.userName || 'N/A'}</p>
                                            <p className="text-xs text-gray-500">{selectedReport.userEmail || ''}</p>
                                          </div>
                                        </div>
                                        <div className="space-y-4">
                                          {selectedReport.photoUrl && (
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                                              <img
                                                src={`http://localhost:5000${selectedReport.photoUrl}`}
                                                alt="Report"
                                                className="w-full h-48 object-cover rounded-lg"
                                              />
                                            </div>
                                          )}
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700">Estimated Quantity</label>
                                            <p className="mt-1 text-sm text-gray-900 capitalize">{selectedReport.estimatedQuantity}</p>
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700">Assigned Collector</label>
                                            <p className="mt-1 text-sm text-gray-900">
                                              {selectedReport.assignedToName || selectedReport.assignedTo?.name || 'Not assigned'}
                                            </p>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700">Created</label>
                                              <p className="mt-1 text-sm text-gray-900">{formatDate(selectedReport.createdAt)}</p>
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700">Updated</label>
                                              <p className="mt-1 text-sm text-gray-900">{formatDate(selectedReport.updatedAt)}</p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-6 flex justify-end space-x-3">
                                        <button
                                          onClick={() => setShowReportModal(false)}
                                          className="btn btn-secondary"
                                        >
                                          Close
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                        {report.status === 'pending' && (
                          <button 
                            onClick={() => handleAssignCollector(report)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && selectedReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Assign Collector</h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Report:</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedReport.description.substring(0, 100)}...
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedReport.address} • {selectedReport.wasteType} • {selectedReport.urgency}
                </p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Collector:
                </label>
                
                {/* Collector Statistics Summary */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-blue-600">
                        {collectors.filter((c: any) => c.isActive).length}
                      </p>
                      <p className="text-xs text-gray-600">Active Collectors</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">
                        {collectors.reduce((sum: number, c: any) => sum + (c.statistics?.completed || 0), 0)}
                      </p>
                      <p className="text-xs text-gray-600">Total Completed</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-orange-600">
                        {collectors.reduce((sum: number, c: any) => sum + (c.statistics?.pending || 0), 0)}
                      </p>
                      <p className="text-xs text-gray-600">Total Pending</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {collectors
                    .filter((c: any) => c.isActive)
                    .sort((a: any, b: any) => (a.statistics?.pending || 0) - (b.statistics?.pending || 0))
                    .map((collector: any) => (
                    <button
                      key={collector._id}
                      onClick={() => handleAssignSubmit(collector._id.toString())}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                      disabled={assignCollectorMutation.isLoading}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{collector.name}</p>
                            {(collector.statistics?.pending || 0) === 0 && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                Available
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{collector.email}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-400">
                              📋 {collector.statistics?.pending || 0} pending
                            </span>
                            <span className="text-xs text-gray-400">
                              ✅ {collector.statistics?.completed || 0} completed
                            </span>
                            <span className="text-xs text-gray-400">
                              🚛 {collector.statistics?.inProgress || 0} in progress
                            </span>
                          </div>
                          
                          {/* Workload indicator */}
                          <div className="mt-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">Workload:</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    (collector.statistics?.pending || 0) <= 2 
                                      ? 'bg-green-500' 
                                      : (collector.statistics?.pending || 0) <= 5 
                                      ? 'bg-yellow-500' 
                                      : 'bg-red-500'
                                  }`}
                                  style={{ 
                                    width: `${Math.min(((collector.statistics?.pending || 0) / 10) * 100, 100)}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">
                                {(collector.statistics?.pending || 0) <= 2 
                                  ? 'Light' 
                                  : (collector.statistics?.pending || 0) <= 5 
                                  ? 'Moderate' 
                                  : 'Heavy'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center ml-4">
                          <Truck className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {collectors.filter((c: any) => c.isActive).length === 0 && (
                  <div className="text-center py-8">
                    <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No active collectors available</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Please activate collectors or create new collector accounts
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="btn btn-secondary"
                  disabled={assignCollectorMutation.isLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto Assignment Modal */}
      {showAutoAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Auto Assignment</h3>
                  <p className="text-sm text-gray-500">Automatically assign reports based on intelligent algorithms</p>
                </div>
                <button
                  onClick={() => setShowAutoAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              {/* Assignment Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Assignment Criteria</h4>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autoAssignSettings.prioritizeProximity}
                        onChange={(e) => setAutoAssignSettings(prev => ({
                          ...prev,
                          prioritizeProximity: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Prioritize proximity to collector</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autoAssignSettings.balanceWorkload}
                        onChange={(e) => setAutoAssignSettings(prev => ({
                          ...prev,
                          balanceWorkload: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Balance workload across collectors</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autoAssignSettings.considerUrgency}
                        onChange={(e) => setAutoAssignSettings(prev => ({
                          ...prev,
                          considerUrgency: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Consider report urgency</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max assignments per collector
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={autoAssignSettings.maxAssignmentsPerCollector}
                      onChange={(e) => setAutoAssignSettings(prev => ({
                        ...prev,
                        maxAssignmentsPerCollector: parseInt(e.target.value)
                      }))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Assignment Preview</h4>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Pending Reports:</span>
                        <span className="font-medium">{reports.filter((r: any) => r.status === 'pending').length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Active Collectors:</span>
                        <span className="font-medium">{collectors.filter((c: any) => c.isActive).length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Estimated Assignments:</span>
                        <span className="font-medium text-green-600">
                          {Math.min(
                            reports.filter((r: any) => r.status === 'pending').length,
                            collectors.filter((c: any) => c.isActive).length * autoAssignSettings.maxAssignmentsPerCollector
                          )}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Algorithm Priority:</h5>
                      <div className="space-y-1 text-xs text-gray-600">
                        {autoAssignSettings.considerUrgency && <div>• Critical/High urgency first</div>}
                        {autoAssignSettings.prioritizeProximity && <div>• Nearest collector preference</div>}
                        {autoAssignSettings.balanceWorkload && <div>• Even workload distribution</div>}
                      </div>
                    </div>
                  </div>
                  
                  {/* Collector Workload Preview */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Collector Workload</h5>
                    {collectors.filter((c: any) => c.isActive).slice(0, 3).map((collector: any) => (
                      <div key={collector._id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{collector.name}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ 
                                width: `${Math.min(((collector.statistics?.pending || 0) / autoAssignSettings.maxAssignmentsPerCollector) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-gray-500">{collector.statistics?.pending || 0}/{autoAssignSettings.maxAssignmentsPerCollector}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  This will automatically assign all pending reports based on your criteria
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowAutoAssignModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      autoAssignMutation.mutate(autoAssignSettings);
                    }}
                    className="btn btn-primary"
                    disabled={autoAssignMutation.isLoading}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Start Auto Assignment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Assignment Modal */}
      {showScheduledModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Schedule Assignment</h3>
                  <p className="text-sm text-gray-500">Schedule automatic assignment for a specific time</p>
                </div>
                <button
                  onClick={() => setShowScheduledModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              {/* Schedule Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Schedule Time</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={scheduledSettings.scheduledDate}
                      onChange={(e) => setScheduledSettings(prev => ({
                        ...prev,
                        scheduledDate: e.target.value
                      }))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduledSettings.scheduledTime}
                      onChange={(e) => setScheduledSettings(prev => ({
                        ...prev,
                        scheduledTime: e.target.value
                      }))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max assignments per collector
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={scheduledSettings.maxAssignmentsPerCollector}
                      onChange={(e) => setScheduledSettings(prev => ({
                        ...prev,
                        maxAssignmentsPerCollector: parseInt(e.target.value)
                      }))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Assignment Criteria</h4>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={scheduledSettings.prioritizeProximity}
                        onChange={(e) => setScheduledSettings(prev => ({
                          ...prev,
                          prioritizeProximity: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Prioritize proximity to collector</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={scheduledSettings.balanceWorkload}
                        onChange={(e) => setScheduledSettings(prev => ({
                          ...prev,
                          balanceWorkload: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Balance workload across collectors</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={scheduledSettings.considerUrgency}
                        onChange={(e) => setScheduledSettings(prev => ({
                          ...prev,
                          considerUrgency: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Consider report urgency</span>
                    </label>
                  </div>
                  
                  {/* Preview */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Schedule Preview</h5>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>📅 Date: {scheduledSettings.scheduledDate || 'Not set'}</div>
                      <div>🕐 Time: {scheduledSettings.scheduledTime || 'Not set'}</div>
                      <div>📊 Max per collector: {scheduledSettings.maxAssignmentsPerCollector}</div>
                      {scheduledSettings.considerUrgency && <div>• Priority by urgency</div>}
                      {scheduledSettings.prioritizeProximity && <div>• Nearest collector preference</div>}
                      {scheduledSettings.balanceWorkload && <div>• Even workload distribution</div>}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  This will schedule automatic assignment for the specified time
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowScheduledModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // For now, just show an alert since backend scheduling isn't implemented
                      alert(`Assignment scheduled for ${scheduledSettings.scheduledDate} at ${scheduledSettings.scheduledTime}`);
                      setShowScheduledModal(false);
                    }}
                    className="btn btn-primary"
                    disabled={!scheduledSettings.scheduledDate || !scheduledSettings.scheduledTime}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Schedule Assignment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
