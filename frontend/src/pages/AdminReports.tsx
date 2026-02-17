import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  UserPlus, 
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  Trash2,
  Edit,
  MoreHorizontal
} from 'lucide-react';
import { apiService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { cn } from '@/utils/cn';

interface Report {
  _id: string;
  user: string;
  userName: string;
  userEmail: string;
  description: string;
  wasteType: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in_progress' | 'collected' | 'resolved';
  location: { lat: number; lng: number };
  address: string;
  estimatedQuantity: string;
  photoUrl?: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
}

const AdminReports = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [wasteTypeFilter, setWasteTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const queryClient = useQueryClient();

  const { data: reportsData, isLoading, error, refetch } = useQuery(
    ['admin-all-reports', page, statusFilter, urgencyFilter, wasteTypeFilter],
    () => apiService.getAdminReports(
      page,
      20,
      statusFilter !== 'all' ? statusFilter : undefined,
      urgencyFilter !== 'all' ? urgencyFilter : undefined
    ),
    {
      keepPreviousData: true,
    }
  );

  const { data: collectorsData } = useQuery(
    'collectors-for-assignment',
    () => apiService.getCollectors(1, 50, true)
  );

  const assignCollectorMutation = useMutation(
    ({ reportId, collectorId }: { reportId: string; collectorId: string }) =>
      apiService.assignCollectorToReport(reportId, collectorId),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['admin-all-reports']);
        setShowAssignModal(false);
        setSelectedReports([]);
        // Show success toast
        const reportWord = selectedReports.length === 1 ? 'report' : 'reports';
        const collectorName = collectors.find((c: any) => c._id === data.data?.report?.assignedTo)?.name || 'collector';
        alert(`Successfully assigned ${selectedReports.length} ${reportWord} to ${collectorName}!`);
      },
      onError: (error: any) => {
        console.error('Assignment error:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to assign collector';
        alert(`Assignment failed: ${errorMessage}`);
      },
    }
  );

  const reports = (reportsData as any)?.data?.reports || [];
  const pagination = (reportsData as any)?.data?.pagination;
  const collectors = (collectorsData as any)?.data?.collectors || [];

  const filteredReports = reports.filter((report: Report) =>
    (report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
     report.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
     report.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     report.wasteType.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (wasteTypeFilter === 'all' || report.wasteType === wasteTypeFilter)
  );

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      collected: 'bg-green-100 text-green-800',
      resolved: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600',
    };
    return colors[urgency as keyof typeof colors] || 'text-gray-600';
  };

  const handleSelectReport = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleSelectAll = () => {
    if (selectedReports.length === filteredReports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(filteredReports.map((r: Report) => r._id));
    }
  };

  const handleBulkAssign = () => {
    if (selectedReports.length > 0) {
      setShowAssignModal(true);
    }
  };

  const handleAssignCollector = async (collectorId: string) => {
    try {
      if (selectedReports.length === 1) {
        await assignCollectorMutation.mutateAsync({
          reportId: selectedReports[0],
          collectorId,
        });
      } else {
        // Handle bulk assignment sequentially to avoid race conditions
        for (const reportId of selectedReports) {
          await assignCollectorMutation.mutateAsync({
            reportId,
            collectorId,
          });
        }
      }
    } catch (error) {
      // Error is already handled in the mutation's onError
      console.error('Assignment operation failed:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load reports. Please try again.</p>
        <button onClick={() => refetch()} className="mt-4 btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and assign waste collection reports
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="btn btn-outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button className="btn btn-outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          {selectedReports.length > 0 && (
            <button
              onClick={handleBulkAssign}
              className="btn btn-primary"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign ({selectedReports.length})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 sticky top-0 z-30">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="collected">Collected</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="all">All Urgency</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <select
            value={wasteTypeFilter}
            onChange={(e) => setWasteTypeFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="all">All Types</option>
            <option value="plastic">Plastic</option>
            <option value="organic">Organic</option>
            <option value="paper">Paper</option>
            <option value="glass">Glass</option>
            <option value="metal">Metal</option>
            <option value="electronic">Electronic</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setUrgencyFilter('all');
              setWasteTypeFilter('all');
            }}
            className="btn btn-secondary"
          >
            <Filter className="w-4 h-4 mr-2" />
            Clear
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedReports.length === filteredReports.length && filteredReports.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-3 text-sm text-gray-700">
                {selectedReports.length > 0 
                  ? `${selectedReports.length} selected`
                  : `${filteredReports.length} reports`
                }
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Total: {pagination?.totalReports || 0} reports
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-12 z-20">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Urgency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
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
              {filteredReports.map((report: Report) => (
                <tr key={report._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedReports.includes(report._id)}
                      onChange={() => handleSelectReport(report._id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start space-x-3">
                      {report.photoUrl && (
                        <img
                          src={`http://localhost:5000${report.photoUrl}`}
                          alt="Report"
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {report.description}
                        </p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3 mr-1" />
                          {report.address}
                        </div>
                        <div className="flex items-center mt-1">
                          <span className="text-xs text-gray-500 mr-2">
                            {report.userName} • {report.wasteType} • {report.estimatedQuantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      getStatusColor(report.status)
                    )}>
                      {report.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                      {report.status === 'collected' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {report.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={cn('flex items-center', getUrgencyColor(report.urgency))}>
                      {(report.urgency === 'high' || report.urgency === 'critical') && (
                        <AlertTriangle className="w-4 h-4 mr-1" />
                      )}
                      <span className="text-sm font-medium capitalize">{report.urgency}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {report.assignedToName || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(report.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowReportModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {report.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedReports([report._id]);
                            setShowAssignModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                      <button className="text-gray-600 hover:text-gray-900">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className="btn btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(page * 20, pagination.totalReports)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.totalReports}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Assign Collector{selectedReports.length > 1 ? 's' : ''}
                </h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  {selectedReports.length === 1 
                    ? 'Assigning 1 report'
                    : `Bulk assigning ${selectedReports.length} reports`
                  }
                </p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Collector:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {collectors.filter((c: any) => c.isActive).map((collector: any) => (
                    <button
                      key={collector._id}
                      onClick={() => handleAssignCollector(collector._id.toString())}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={assignCollectorMutation.isLoading}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{collector.name}</p>
                          <p className="text-sm text-gray-500">{collector.email}</p>
                          <p className="text-xs text-gray-400">
                            {collector.statistics?.pending || 0} pending assignments
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
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
                      <p className={cn('mt-1 text-sm font-medium capitalize', getUrgencyColor(selectedReport.urgency))}>
                        {selectedReport.urgency}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1',
                      getStatusColor(selectedReport.status)
                    )}>
                      {selectedReport.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReport.address}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reported By</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReport.userName}</p>
                    <p className="text-xs text-gray-500">{selectedReport.userEmail}</p>
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
                      {selectedReport.assignedToName || 'Not assigned'}
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
                {selectedReport.status === 'pending' && (
                  <button
                    onClick={() => {
                      setSelectedReports([selectedReport._id]);
                      setShowReportModal(false);
                      setShowAssignModal(true);
                    }}
                    className="btn btn-primary"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign Collector
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
