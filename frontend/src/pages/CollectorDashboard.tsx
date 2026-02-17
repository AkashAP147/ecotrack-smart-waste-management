import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  Navigation, 
  Package,
  TrendingUp,
  AlertCircle,
  Play,
  Square,
  Target,
  Timer,
  Zap,
  Award,
  BarChart3,
  RefreshCw,
  Truck,
  Calendar,
  Filter
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import LoadingSpinner from '@/components/LoadingSpinner';
import ApiErrorHandler from '@/components/ApiErrorHandler';
import ErrorBoundary from '@/components/ErrorBoundary';

const CollectorDashboard = () => {
  const { user } = useAuthStore();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'route' | 'performance'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const queryClient = useQueryClient();

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useQuery(
    'collector-dashboard',
    () => apiService.getCollectorDashboard(),
    { 
      enabled: !!user,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );

  const { data: routeData, isLoading: routeLoading, error: routeError, refetch: refetchRoute } = useQuery(
    ['collector-route', user?._id],
    () => apiService.getCollectorRoute(user!._id),
    { 
      enabled: !!user,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );

  // Generate notifications based on data
  useEffect(() => {
    if (dashboardData?.data && routeData?.data) {
      const newNotifications = [];
      const stats = dashboardData.data.statistics;
      const route = routeData.data.route;

      // High priority reports notification
      if (stats?.highPriority > 0) {
        newNotifications.push({
          id: 'high-priority',
          type: 'warning',
          title: 'High Priority Reports',
          message: `You have ${stats.highPriority} high/critical priority reports assigned`,
          time: new Date().toISOString(),
        });
      }

      // Route optimization notification
      if (route && route.reports && route.reports.length > 3) {
        newNotifications.push({
          id: 'route-optimization',
          type: 'info',
          title: 'Route Optimization',
          message: `Optimized route available with ${route.reports.length} stops (${route.totalDistance?.toFixed(1)}km)`,
          time: new Date().toISOString(),
        });
      }

      // Completion milestone notification
      if (stats?.completedToday >= 5) {
        newNotifications.push({
          id: 'milestone',
          type: 'success',
          title: 'Great Progress!',
          message: `You've completed ${stats.completedToday} reports today. Excellent work!`,
          time: new Date().toISOString(),
        });
      }

      setNotifications(newNotifications);
    }
  }, [dashboardData, routeData]);

  const startPickupMutation = useMutation(
    (reportId: string) => apiService.startPickup(reportId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('collector-dashboard');
        queryClient.invalidateQueries(['collector-route', user?._id]);
      },
    }
  );

  const completePickupMutation = useMutation(
    ({ reportId, data }: { reportId: string; data: any }) => 
      apiService.completePickup(reportId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('collector-dashboard');
        queryClient.invalidateQueries(['collector-route', user?._id]);
      },
    }
  );

  const stats = dashboardData?.data?.statistics;
  const todayReports = dashboardData?.data?.todayReports || [];
  const recentPickups = dashboardData?.data?.recentPickups || [];
  const route = routeData?.data?.route;

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries('collector-dashboard');
    await queryClient.invalidateQueries(['collector-route', user?._id]);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleStartPickup = (reportId: string) => {
    startPickupMutation.mutate(reportId);
  };

  const handleCompletePickup = (reportId: string, data: any) => {
    completePickupMutation.mutate({ reportId, data });
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

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openInMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // Handle errors
  if (dashboardError && !dashboardLoading) {
    return (
      <ApiErrorHandler
        error={dashboardError}
        onRetry={() => refetchDashboard()}
        isRetrying={dashboardLoading}
      />
    );
  }

  if (routeError && !routeLoading) {
    return (
      <ApiErrorHandler
        error={routeError}
        onRetry={() => refetchRoute()}
        isRetrying={routeLoading}
      />
    );
  }

  if (dashboardLoading || routeLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Collector Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.name}! • {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="btn btn-outline relative"
            >
              <AlertCircle className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            
            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No new notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'success' ? 'bg-green-500' :
                            notification.type === 'warning' ? 'bg-yellow-500' :
                            notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notification.time).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Active
          </span>
        </div>
      </div>

      {/* Statistics Cards */}
      {dashboardLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="card-body flex justify-center">
                <LoadingSpinner />
              </div>
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today's Pickups</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {(stats?.pendingReports || 0) + (stats?.inProgressReports || 0)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Assigned to you
                  </p>
                </div>
                <Package className="w-12 h-12 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed Today</p>
                  <p className="text-3xl font-bold text-green-600">
                    {stats?.completedToday || 0}
                  </p>
                  <p className="text-sm text-green-500 mt-1">
                    Great progress!
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Time Remaining</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {formatTime(stats?.estimatedTimeRemaining || 0)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Estimated
                  </p>
                </div>
                <Clock className="w-12 h-12 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Distance</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {route ? `${route.totalDistance.toFixed(1)}km` : '0km'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Today's route
                  </p>
                </div>
                <Navigation className="w-12 h-12 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Route and Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Today's Route
              </h2>
              {route && route.reports && route.reports.length > 0 && (
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => {
                      // Start the first assigned report in the route
                      const firstAssigned = route.reports.find((r: any) => r.report.status === 'assigned');
                      if (firstAssigned) {
                        handleStartPickup(firstAssigned.report._id);
                      }
                    }}
                    disabled={startPickupMutation.isLoading || !route?.reports?.some((r: any) => r.report.status === 'assigned')}
                    className="btn btn-primary btn-sm"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Start Route
                  </button>
                  <button 
                    onClick={() => {
                      // Open route in Google Maps with multiple waypoints
                      const waypoints = route.reports?.map((r: any) => 
                        `${r.report.location.coordinates[1]},${r.report.location.coordinates[0]}`
                      ).join('|') || '';
                      const url = `https://www.google.com/maps/dir/?api=1&waypoints=${waypoints}&travelmode=driving`;
                      window.open(url, '_blank');
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    View Route
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="card-body">
            {routeLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : !route || !route.reports || route.reports.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No pickups assigned
                </h3>
                <p className="text-gray-600">
                  Check back later for new assignments or contact your supervisor.
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Route Summary
                      </p>
                      <p className="text-sm text-blue-600">
                        {route.reports?.length || 0} stops • {route.totalDistance?.toFixed(1) || 0}km • {formatTime(route.totalTime || 0)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {route.reports?.map((routePoint: any, index: number) => (
                    <div
                      key={routePoint.report._id}
                      className={`border rounded-lg p-3 sm:p-4 transition-colors ${
                        selectedReport === routePoint.report._id
                          ? 'border-primary-300 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedReport(
                        selectedReport === routePoint.report._id ? null : routePoint.report._id
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex items-start space-x-3 flex-1">
                          {routePoint.report.photoUrl ? (
                            <img
                              src={`http://localhost:5000${routePoint.report.photoUrl}`}
                              alt="Waste report"
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                              onLoad={() => console.log('Route image loaded:', `http://localhost:5000${routePoint.report.photoUrl}`)}
                              onError={(e) => {
                                console.log('Route image failed:', `http://localhost:5000${routePoint.report.photoUrl}`);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-lg border border-gray-200 flex-shrink-0 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No image</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="bg-primary-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                                {index + 1}
                              </span>
                              <span className={`badge text-xs ${getUrgencyBadge(routePoint.report.urgency)} flex-shrink-0`}>
                                {routePoint.report.urgency}
                              </span>
                              <span className="badge badge-secondary text-xs flex-shrink-0">
                                {routePoint.report.wasteType}
                              </span>
                            </div>
                            
                            <p className="font-medium text-gray-900 mb-2 text-sm">
                              {routePoint.report.description}
                            </p>
                            
                            <div className="space-y-1 text-xs text-gray-600">
                              <div className="flex items-start">
                                <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                <span className="font-medium mr-1">
                                  {routePoint.report.status === 'in_progress' ? 'Pickup:' : 'Location:'}
                                </span>
                                <span className="truncate">
                                  {routePoint.report.address || 
                                   `${routePoint.report.location?.coordinates?.[1]?.toFixed(4) || 'Unknown'}, ${routePoint.report.location?.coordinates?.[0]?.toFixed(4) || 'Unknown'}`}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span>Est: {formatTime(routePoint.estimatedTime)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openInMaps(
                                routePoint.report.location.coordinates[1],
                                routePoint.report.location.coordinates[0]
                              );
                            }}
                            className="btn btn-ghost btn-xs sm:btn-sm p-1 sm:p-2"
                            title="Open in Maps"
                          >
                            <Navigation className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          
                          {routePoint.report.status === 'assigned' && (
                            <>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartPickup(routePoint.report._id);
                                }}
                                disabled={startPickupMutation.isLoading}
                                className="btn btn-primary btn-xs sm:btn-sm px-2 py-1"
                                title="Start pickup and begin navigation"
                              >
                                <Play className="w-3 h-3 mr-1" />
                                <span className="hidden xs:inline">Start</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openInMaps(
                                    routePoint.report.location.coordinates[1],
                                    routePoint.report.location.coordinates[0]
                                  );
                                }}
                                className="btn btn-outline btn-xs sm:btn-sm px-2 py-1"
                                title="Navigate to pickup location"
                              >
                                <Navigation className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          
                          {routePoint.report.status === 'in_progress' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompletePickup(routePoint.report._id, {
                                  actualQuantity: routePoint.report.estimatedQuantity,
                                  wasteTypeConfirmed: routePoint.report.wasteType,
                                  notes: 'Completed successfully'
                                });
                              }}
                              disabled={completePickupMutation.isLoading}
                              className="btn btn-success btn-xs sm:btn-sm px-2 py-1"
                            >
                              <Square className="w-3 h-3 mr-1" />
                              <span className="hidden xs:inline">Complete</span>
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {selectedReport === routePoint.report._id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-gray-700">Reporter</p>
                              <p className="text-gray-600">
                                {typeof routePoint.report.user === 'object' 
                                  ? routePoint.report.user.name 
                                  : 'Unknown'}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">Reported</p>
                              <p className="text-gray-600">
                                {formatDate(routePoint.report.createdAt)}
                              </p>
                            </div>
                            {routePoint.report.estimatedQuantity && (
                              <div className="col-span-2">
                                <p className="font-medium text-gray-700">Estimated Quantity</p>
                                <p className="text-gray-600">{routePoint.report.estimatedQuantity}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>        </div>
        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h2>
          </div>
          <div className="card-body">
            {dashboardLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : recentPickups.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No recent pickups</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentPickups.map((pickup: any) => (
                  <div key={pickup._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">
                          {pickup.report?.description?.substring(0, 50)}...
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span className={`badge ${pickup.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                            {pickup.status}
                          </span>
                          <span>•</span>
                          <span>{formatDate(pickup.endTime || pickup.startTime || pickup.createdAt)}</span>
                        </div>
                        {pickup.duration && (
                          <p className="text-sm text-gray-500 mt-1">
                            Duration: {formatTime(pickup.duration)}
                          </p>
                        )}
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Reports */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Today's Reports</h2>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">{todayReports.length} reports</span>
            </div>
          </div>
        </div>
        <div className="card-body">
          {todayReports.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No reports assigned for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayReports.slice(0, 5).map((report: any) => (
                <div key={report._id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-start space-x-3">
                    {report.photoUrl ? (
                      <img
                        src={`http://localhost:5000${report.photoUrl}`}
                        alt="Waste report"
                        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border border-gray-200"
                        onLoad={() => console.log('Image loaded:', `http://localhost:5000${report.photoUrl}`)}
                        onError={(e) => {
                          console.log('Image failed to load:', `http://localhost:5000${report.photoUrl}`);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-lg border border-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No image</span>
                      </div>
                    )}
                    <div className={`w-3 h-3 rounded-full mt-2 ${
                      report.urgency === 'critical' ? 'bg-red-500' :
                      report.urgency === 'high' ? 'bg-orange-500' :
                      report.urgency === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {report.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1 text-xs text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span className="font-medium">
                            {report.status === 'in_progress' ? 'At Pickup:' : 'Location:'}
                          </span>
                        </div>
                        <span className="truncate">
                          {report.address || `${report.location?.coordinates?.[1]?.toFixed(4) || 'Unknown'}, ${report.location?.coordinates?.[0]?.toFixed(4) || 'Unknown'}`}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{report.wasteType}</span>
                        <span>•</span>
                        <span className="capitalize">{report.urgency}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 mt-2 sm:mt-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadge(report.status)}`}>
                      {report.status.replace('_', ' ')}
                    </span>
                    {report.status === 'assigned' && (
                      <div className="flex gap-1 sm:gap-2">
                        <button 
                          onClick={() => handleStartPickup(report._id)}
                          disabled={startPickupMutation.isLoading}
                          className="btn btn-sm btn-primary flex-shrink-0"
                          title="Start pickup and get navigation"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Start</span>
                        </button>
                        <button
                          onClick={() => openInMaps(
                            report.location?.coordinates?.[1] || 0,
                            report.location?.coordinates?.[0] || 0
                          )}
                          className="btn btn-sm btn-outline flex-shrink-0"
                          title="Navigate to location"
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Go</span>
                        </button>
                      </div>
                    )}
                    {report.status === 'in_progress' && (
                      <button 
                        onClick={() => handleCompletePickup(report._id, {
                          actualQuantity: report.estimatedQuantity,
                          wasteTypeConfirmed: report.wasteType,
                          notes: 'Completed successfully'
                        })}
                        disabled={completePickupMutation.isLoading}
                        className="btn btn-sm btn-success flex-shrink-0"
                      >
                        <Square className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Complete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Performance Metrics */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Performance Analytics</h2>
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Real-time metrics</span>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {stats?.completedToday || 0}
              </h3>
              <p className="text-gray-600">Completed Today</p>
              <div className="flex items-center justify-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{stats?.completedToday || 0} from yesterday</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {stats?.totalAssigned || 0}
              </h3>
              <p className="text-gray-600">Total Assigned</p>
              <div className="flex items-center justify-center mt-2">
                <Target className="w-4 h-4 text-blue-500 mr-1" />
                <span className="text-sm text-blue-600">{stats?.pending || 0} pending</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {stats?.totalAssigned > 0 ? Math.round(((stats?.completed || 0) / stats.totalAssigned) * 100) : 0}%
              </h3>
              <p className="text-gray-600">Success Rate</p>
              <div className="flex items-center justify-center mt-2">
                <Award className="w-4 h-4 text-purple-500 mr-1" />
                <span className="text-sm text-purple-600">Excellent</span>
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Timer className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {stats?.estimatedTimeRemaining ? formatTime(stats.estimatedTimeRemaining) : '0m'}
              </h3>
              <p className="text-gray-600">Time Remaining</p>
              <div className="flex items-center justify-center mt-2">
                <Zap className="w-4 h-4 text-orange-500 mr-1" />
                <span className="text-sm text-orange-600">On track</span>
              </div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Today's Progress</span>
                <span className="text-sm text-gray-500">
                  {stats?.completedToday || 0} / {stats?.todayAssigned || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${stats?.todayAssigned > 0 
                      ? Math.round(((stats?.completedToday || 0) / (stats?.todayAssigned || 1)) * 100)
                      : 0}%` 
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Completion</span>
                <span className="text-sm text-gray-500">
                  {stats?.completed || 0} / {stats?.totalAssigned || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${stats?.totalAssigned > 0 
                      ? Math.round(((stats?.completed || 0) / stats.totalAssigned) * 100)
                      : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default CollectorDashboard;
