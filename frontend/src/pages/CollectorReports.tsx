import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Truck,
  Eye,
  Filter,
  Search,
  Navigation,
  Package,
  User,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { apiService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/authStore';
import { Report } from '@/types';

const CollectorReports = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const { data: reportsData, isLoading, error, refetch } = useQuery(
    ['collector-reports', user?._id, page, statusFilter, urgencyFilter],
    () => apiService.getCollectorReports(user!._id, {
      page,
      limit: 10,
      status: statusFilter !== 'all' ? statusFilter as any : undefined,
      urgency: urgencyFilter !== 'all' ? urgencyFilter as any : undefined,
    }),
    {
      enabled: !!user?._id,
      keepPreviousData: true,
    }
  );

  const reports = reportsData?.data?.reports || [];
  const pagination = reportsData?.data?.pagination;

  // Debug logging for photoUrls
  console.log('CollectorReports - fetched reports:', reports);
  console.log('PhotoUrls in reports:', reports.map(r => ({ id: r._id, photoUrl: r.photoUrl, description: r.description.substring(0, 20) })));

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

  const getUrgencyIcon = (urgency: string) => {
    if (urgency === 'critical' || urgency === 'high') {
      return <AlertTriangle className="w-4 h-4" />;
    }
    return <Clock className="w-4 h-4" />;
  };

  // Mutations for different actions
  const assignToSelfMutation = useMutation(
    (reportId: string) => apiService.assignSelfToReport(reportId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['collector-reports']);
        refetch();
      },
      onError: (error) => {
        console.error('Failed to assign report:', error);
      },
    }
  );

  const startPickupMutation = useMutation(
    (reportId: string) => apiService.startPickup(reportId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['collector-reports']);
        queryClient.invalidateQueries('collector-dashboard');
        refetch();
      },
      onError: (error) => {
        console.error('Failed to start pickup:', error);
      },
    }
  );

  const completePickupMutation = useMutation(
    (data: { reportId: string; actualQuantity?: string; notes?: string }) => 
      apiService.completePickup(data.reportId, { 
        actualQuantity: data.actualQuantity, 
        notes: data.notes 
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['collector-reports']);
        queryClient.invalidateQueries('collector-dashboard');
        refetch();
      },
      onError: (error) => {
        console.error('Failed to complete pickup:', error);
      },
    }
  );

  const handleAssignToSelf = (reportId: string) => {
    assignToSelfMutation.mutate(reportId);
  };

  const handleStartPickup = (reportId: string) => {
    startPickupMutation.mutate(reportId);
  };

  const handleCompletePickup = (reportId: string, actualQuantity?: string, notes?: string) => {
    completePickupMutation.mutate({ reportId, actualQuantity, notes });
  };

  const handleViewDetails = (report: Report) => {
    setSelectedReport(report);
    setShowDetails(true);
  };

  const openInMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const filteredReports = reports.filter((report: any) =>
    report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.wasteType.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <button
          onClick={() => refetch()}
          className="mt-4 btn btn-primary"
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
          <h1 className="text-2xl font-bold text-gray-900">All Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage waste reports from users
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {pagination?.totalReports || 0} Total Reports
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 sticky top-0 z-30">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Search */}
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

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="collected">Collected</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Urgency Filter */}
          <div>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">All Urgency</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div>
            <button
              onClick={() => {
                setStatusFilter('all');
                setUrgencyFilter('all');
                setSearchTerm('');
              }}
              className="w-full btn btn-secondary"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <Truck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || urgencyFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No reports have been submitted yet'}
            </p>
          </div>
        ) : (
          filteredReports.map((report: any) => (
            <div
              key={report._id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow h-full flex flex-col"
            >
              <div className="flex-1">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          getStatusColor(report.status)
                        )}>
                          {report.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={cn(
                          'inline-flex items-center space-x-1 text-xs font-medium',
                          getUrgencyColor(report.urgency)
                        )}>
                          {getUrgencyIcon(report.urgency)}
                          <span>{report.urgency.toUpperCase()}</span>
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {report.description}
                      </h3>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span>{report.address || `Coordinates: ${report.location?.coordinates?.[1]?.toFixed(4) || 'Unknown'}, ${report.location?.coordinates?.[0]?.toFixed(4) || 'Unknown'}`}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-medium">Type:</span>
                          <span className="capitalize">{report.wasteType}</span>
                          <span className="font-medium">Quantity:</span>
                          <span className="capitalize">{report.estimatedQuantity}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-medium">Reported by:</span>
                          <span>{report.userName}</span>
                          <span className="font-medium">Date:</span>
                          <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 flex-shrink-0 w-20 h-20">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                        {report.photoUrl ? (
                          <img
                            src={`http://localhost:5000${report.photoUrl}`}
                            alt=""
                            className="w-full h-full object-cover"
                            onLoad={(e) => {
                              console.log('✅ Image loaded successfully!');
                              console.log('  PhotoURL:', report.photoUrl);
                              console.log('  Full URL:', `http://localhost:5000${report.photoUrl}`);
                              console.log('  Image dimensions:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
                            }}
                            onError={(e) => {
                              console.log('❌ Image failed to load!');
                              console.log('  PhotoURL:', report.photoUrl);
                              console.log('  Full URL:', `http://localhost:5000${report.photoUrl}`);
                              console.log('  Error event:', e);
                              
                              // Test the URL directly
                              fetch(`http://localhost:5000${report.photoUrl}`)
                                .then(response => {
                                  console.log('  Fetch test - Status:', response.status);
                                  console.log('  Fetch test - OK:', response.ok);
                                  console.log('  Fetch test - Headers:', [...response.headers.entries()]);
                                })
                                .catch(fetchError => {
                                  console.log('  Fetch test - Error:', fetchError);
                                });
                              
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<span class="text-xs text-red-500">Load failed</span>';
                              }
                            }}
                          />
                        ) : (
                          <span className="text-xs text-gray-400">No photo</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col sm:flex-row sm:flex-wrap gap-2">
                  {/* Navigation Button */}
                  <button
                    onClick={() => openInMaps(report.location?.coordinates?.[1] || 0, report.location?.coordinates?.[0] || 0)}
                    className="btn btn-outline btn-sm min-w-0 flex-shrink-0"
                  >
                    <Navigation className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Navigate</span>
                    <span className="xs:hidden">Nav</span>
                  </button>

                  {/* View Details Button */}
                  <button 
                    onClick={() => handleViewDetails(report)}
                    className="btn btn-secondary btn-sm min-w-0 flex-shrink-0"
                  >
                    <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">View Details</span>
                    <span className="xs:hidden">Details</span>
                  </button>

                  {/* Status-specific Actions */}
                  {report.status === 'pending' && (
                    <button
                      onClick={() => handleAssignToSelf(report._id)}
                      disabled={assignToSelfMutation.isLoading}
                      className="btn btn-primary btn-sm min-w-0 flex-shrink-0"
                    >
                      {assignToSelfMutation.isLoading ? (
                        <RefreshCw className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                      ) : (
                        <Truck className="w-4 h-4 mr-1 sm:mr-2" />
                      )}
                      <span className="hidden xs:inline">{assignToSelfMutation.isLoading ? 'Assigning...' : 'Assign to Me'}</span>
                      <span className="xs:hidden">Assign</span>
                    </button>
                  )}
                  
                  {report.status === 'assigned' && report.assignedTo === user?._id && (
                    <>
                      <button
                        onClick={() => handleStartPickup(report._id)}
                        disabled={startPickupMutation.isLoading}
                        className="btn btn-success btn-sm min-w-0 flex-shrink-0"
                      >
                        {startPickupMutation.isLoading ? (
                          <RefreshCw className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-1 sm:mr-2" />
                        )}
                        <span className="hidden xs:inline">{startPickupMutation.isLoading ? 'Starting...' : 'Start Pickup'}</span>
                        <span className="xs:hidden">Start</span>
                      </button>
                      <button
                        onClick={() => openInMaps(report.location?.coordinates?.[1] || 0, report.location?.coordinates?.[0] || 0)}
                        className="btn btn-outline btn-sm min-w-0 flex-shrink-0"
                        title="Navigate to location before pickup"
                      >
                        <Navigation className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">Navigate</span>
                        <span className="xs:hidden">Go</span>
                      </button>
                    </>
                  )}

                  {report.status === 'in_progress' && report.assignedTo === user?._id && (
                    <button
                      onClick={() => handleCompletePickup(report._id)}
                      disabled={completePickupMutation.isLoading}
                      className="btn btn-success btn-sm min-w-0 flex-shrink-0"
                    >
                      {completePickupMutation.isLoading ? (
                        <RefreshCw className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                      ) : (
                        <Package className="w-4 h-4 mr-1 sm:mr-2" />
                      )}
                      <span className="hidden xs:inline">{completePickupMutation.isLoading ? 'Completing...' : 'Complete Pickup'}</span>
                      <span className="xs:hidden">Complete</span>
                    </button>
                  )}

                  {report.status === 'assigned' && report.assignedTo !== user?._id && (
                    <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded">
                      <User className="w-4 h-4 inline mr-1" />
                      Assigned to another collector
                    </div>
                  )}

                  {report.status === 'collected' && (
                    <div className="text-sm text-green-600 p-2 bg-green-50 rounded">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Completed
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200">
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
                Showing{' '}
                <span className="font-medium">
                  {(page - 1) * 10 + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(page * 10, pagination.totalReports)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.totalReports}</span>{' '}
                results
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

      {/* Report Details Modal */}
      {showDetails && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Report Details</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Status and Priority */}
                <div className="flex items-center space-x-4">
                  <span className={cn(
                    'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                    getStatusColor(selectedReport.status)
                  )}>
                    {selectedReport.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={cn(
                    'inline-flex items-center space-x-1 text-sm font-medium',
                    getUrgencyColor(selectedReport.urgency)
                  )}>
                    {getUrgencyIcon(selectedReport.urgency)}
                    <span>{selectedReport.urgency.toUpperCase()}</span>
                  </span>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700">{selectedReport.description}</p>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Location</h3>
                  <div className="flex items-center space-x-2 text-gray-700">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedReport.address || `Coordinates: ${selectedReport.location?.coordinates?.[1]?.toFixed(4) || 'Unknown'}, ${selectedReport.location?.coordinates?.[0]?.toFixed(4) || 'Unknown'}`}</span>
                  </div>
                  {!selectedReport.address && selectedReport.location?.coordinates?.[1] && selectedReport.location?.coordinates?.[0] && (
                    <p className="text-sm text-amber-600 mt-1">
                      📍 Address not provided - showing coordinates (lat, lng)
                    </p>
                  )}
                  <button
                    onClick={() => openInMaps(selectedReport.location?.coordinates?.[1] || 0, selectedReport.location?.coordinates?.[0] || 0)}
                    className="mt-2 btn btn-outline btn-sm"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Open in Maps
                  </button>
                </div>

                {/* Waste Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Waste Type</h3>
                    <p className="text-gray-700 capitalize">{selectedReport.wasteType}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Estimated Quantity</h3>
                    <p className="text-gray-700 capitalize">{selectedReport.estimatedQuantity}</p>
                  </div>
                </div>

                {/* Reporter Info */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Reported By</h3>
                  <div className="flex items-center space-x-2 text-gray-700">
                    <User className="w-4 h-4" />
                    <span>{selectedReport.userName}</span>
                    <span className="text-gray-500">({selectedReport.userEmail})</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Reported On</h3>
                    <div className="flex items-center space-x-2 text-gray-700">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(selectedReport.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Last Updated</h3>
                    <div className="flex items-center space-x-2 text-gray-700">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(selectedReport.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Photo */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Photo</h3>
                  <div className="w-full max-w-md h-64 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                    {selectedReport.photoUrl ? (
                      <img
                        src={`http://localhost:5000${selectedReport.photoUrl}`}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log('❌ Modal image failed:', selectedReport.photoUrl);
                          console.log('Full URL tried:', `http://localhost:5000${selectedReport.photoUrl}`);
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="flex items-center justify-center h-full"><span class="text-red-500 text-sm">Image failed to load</span></div>';
                          }
                        }}
                        onLoad={() => {
                          console.log('✅ Modal image loaded:', selectedReport.photoUrl);
                        }}
                      />
                    ) : (
                      <span className="text-gray-500">No photo available</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {selectedReport.status === 'pending' && (
                    <button
                      onClick={() => {
                        handleAssignToSelf(selectedReport._id);
                        setShowDetails(false);
                      }}
                      disabled={assignToSelfMutation.isLoading}
                      className="btn btn-primary"
                    >
                      {assignToSelfMutation.isLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Truck className="w-4 h-4 mr-2" />
                      )}
                      {assignToSelfMutation.isLoading ? 'Assigning...' : 'Assign to Me'}
                    </button>
                  )}
                  
                  {selectedReport.status === 'assigned' && selectedReport.assignedTo === user?._id && (
                    <>
                      <button
                        onClick={() => {
                          handleStartPickup(selectedReport._id);
                          setShowDetails(false);
                        }}
                        disabled={startPickupMutation.isLoading}
                        className="btn btn-success"
                        title="Start pickup and get navigation"
                      >
                        {startPickupMutation.isLoading ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        {startPickupMutation.isLoading ? 'Starting...' : 'Start Pickup'}
                      </button>
                      <button
                        onClick={() => openInMaps(selectedReport.location?.coordinates?.[1] || 0, selectedReport.location?.coordinates?.[0] || 0)}
                        className="btn btn-outline"
                        title="Navigate to pickup location"
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        Navigate Now
                      </button>
                    </>
                  )}

                  {selectedReport.status === 'in_progress' && selectedReport.assignedTo === user?._id && (
                    <button
                      onClick={() => {
                        handleCompletePickup(selectedReport._id);
                        setShowDetails(false);
                      }}
                      disabled={completePickupMutation.isLoading}
                      className="btn btn-success"
                    >
                      {completePickupMutation.isLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Package className="w-4 h-4 mr-2" />
                      )}
                      {completePickupMutation.isLoading ? 'Completing...' : 'Complete Pickup'}
                    </button>
                  )}

                  <button
                    onClick={() => openInMaps(selectedReport.location?.coordinates?.[1] || 0, selectedReport.location?.coordinates?.[0] || 0)}
                    className="btn btn-outline"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Navigate
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

export default CollectorReports;
