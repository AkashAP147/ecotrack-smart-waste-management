import { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Filter, 
  Search, 
  MapPin, 
  Calendar,
  Eye,
  MoreVertical,
  FileText
} from 'lucide-react';
import { apiService } from '@/services/api';
import { Report, ReportStatus } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';

const MyReports = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useQuery(
    ['my-reports', currentPage, statusFilter],
    () => apiService.getMyReports(currentPage, 10, statusFilter || undefined),
    { keepPreviousData: true }
  );

  const reports = data?.data?.reports || [];
  const pagination = data?.data?.pagination;

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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredReports = reports.filter((report: Report) =>
    report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          Failed to load reports. Please try again.
        </div>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
        >
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
          <h1 className="text-2xl font-bold text-gray-900">My Reports</h1>
          <p className="text-gray-600 mt-1">
            Track your waste reports and their collection status
          </p>
        </div>
        <Link to="/report/new" className="btn btn-primary mt-4 sm:mt-0">
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ReportStatus | '')}
                className="form-select"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="collected">Collected</option>
                <option value="resolved">Resolved</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {reports.length === 0 ? 'No reports yet' : 'No matching reports'}
              </h3>
              <p className="text-gray-600 mb-6">
                {reports.length === 0 
                  ? 'Start making a difference by reporting waste in your area.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
              {reports.length === 0 && (
                <Link to="/report/new" className="btn btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Report
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report: Report) => (
                <div
                  key={report._id}
                  className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Status and badges */}
                      <div className="flex items-center space-x-2 mb-3">
                        <span className={`badge ${getStatusBadge(report.status)}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                        <span className={`badge ${getUrgencyBadge(report.urgency)}`}>
                          {report.urgency}
                        </span>
                        <span className="badge badge-secondary">
                          {report.wasteType.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Description */}
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {report.description}
                      </h3>

                      {/* Location and date */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 text-sm text-gray-600 space-y-1 sm:space-y-0">
                        {report.address && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {report.address}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(report.createdAt)}
                        </div>
                      </div>

                      {/* Additional info */}
                      {(report.estimatedQuantity || report.actualQuantity) && (
                        <div className="mt-2 text-sm text-gray-600">
                          <strong>Quantity:</strong>{' '}
                          {report.actualQuantity || report.estimatedQuantity}
                        </div>
                      )}

                      {/* Collector info */}
                      {report.assignedTo && typeof report.assignedTo === 'object' && (
                        <div className="mt-2 text-sm text-gray-600">
                          <strong>Assigned to:</strong> {report.assignedTo.name}
                        </div>
                      )}

                      {/* Collection dates */}
                      {report.assignedAt && (
                        <div className="mt-1 text-sm text-gray-600">
                          <strong>Assigned:</strong> {formatDate(report.assignedAt)}
                        </div>
                      )}
                      {report.collectedAt && (
                        <div className="mt-1 text-sm text-gray-600">
                          <strong>Collected:</strong> {formatDate(report.collectedAt)}
                        </div>
                      )}

                      {/* Notes */}
                      {report.collectorNotes && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Collector Notes:</strong> {report.collectorNotes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {report.photo && (
                        <button
                          onClick={() => {
                            const imageUrl = report.photoUrl || apiService.getFileUrl(report.photo);
                            window.open(imageUrl, '_blank');
                          }}
                          className="btn btn-ghost btn-sm"
                          title="View photo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button className="btn btn-ghost btn-sm">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="card-footer">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((pagination.currentPage - 1) * 10) + 1} to{' '}
                {Math.min(pagination.currentPage * 10, pagination.totalReports)} of{' '}
                {pagination.totalReports} reports
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="btn btn-outline btn-sm"
                >
                  Previous
                </button>
                
                <span className="text-sm text-gray-600">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="btn btn-outline btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReports;
