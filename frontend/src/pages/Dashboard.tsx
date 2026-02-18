import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  MapPin,
  Camera
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useState } from 'react';

const Dashboard = () => {
  const { user } = useAuthStore();

  const { data: reportsData, isLoading: reportsLoading } = useQuery(
    'my-reports',
    () => apiService.getMyReports(1, 5),
    { enabled: !!user }
  );

  const { data: statsData, isLoading: statsLoading } = useQuery(
    'report-statistics',
    () => apiService.getReportStatistics(),
    { enabled: !!user }
  );

  const reports = reportsData?.data?.reports || [];
  const stats = statsData?.data?.overview;

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

  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleViewImage = (report: any) => {
    setSelectedReport(report);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setSelectedReport(null);
  };

  const quickActions = [
    {
      title: 'Report Waste',
      description: 'Create a new waste report',
      icon: Plus,
      href: '/report/new',
      color: 'bg-primary-600 hover:bg-primary-700',
    },
    {
      title: 'View Reports',
      description: 'See all your reports',
      icon: FileText,
      href: '/reports',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      title: 'Profile',
      description: 'Update your profile',
      icon: Camera,
      href: '/profile',
      color: 'bg-purple-600 hover:bg-purple-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-primary-100">
          Ready to make a difference in your community? Report waste and track your impact.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link
              key={index}
              to={action.href}
              className={`${action.color} text-white p-6 rounded-lg transition-colors group`}
            >
              <div className="flex items-center space-x-4">
                <Icon className="w-8 h-8" />
                <div>
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Statistics */}
      {statsLoading ? (
        <div className="card">
          <div className="card-body flex justify-center">
            <LoadingSpinner />
          </div>
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalReports}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pendingReports}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Collected</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.collectedReports}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.criticalReports}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Reports */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Reports
            </h2>
            <Link
              to="/reports"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View all
            </Link>
          </div>
        </div>
        <div className="card-body">
          {reportsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No reports yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start making a difference by reporting waste in your area.
              </p>
              <Link to="/report/new" className="btn btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create First Report
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report: any) => (
                <div
                  key={report._id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`badge ${getStatusBadge(report.status)}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                        <span className={`badge ${getUrgencyBadge(report.urgency)}`}>
                          {report.urgency}
                        </span>
                        <span className="badge badge-secondary">
                          {report.wasteType}
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium mb-1">
                        {report.description}
                      </p>
                      {report.address && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-1" />
                          {report.address}
                        </div>
                      )}
                      {/* Waste Image View Option */}
                      {report.photoData || report.photoUrl ? (
                        <div className="mt-2 flex justify-end">
                          <button
                            className="btn btn-sm bg-green-600 hover:bg-green-700 text-white font-semibold"
                            onClick={() => handleViewImage(report)}
                          >
                            View Waste Image & Details
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
                  {/* Waste Image Modal */}
                  {showModal && selectedReport && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
                        <button
                          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                          onClick={closeModal}
                        >
                          &times;
                        </button>
                        <h3 className="text-lg font-semibold mb-4">Waste Image & Report Details</h3>
                        <img
                          src={`/api/report/image/${selectedReport._id}`}
                          alt="Waste"
                          className="w-full h-48 object-cover rounded mb-4 border"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="space-y-2">
                          <div><strong>Description:</strong> {selectedReport.description}</div>
                          <div><strong>Status:</strong> {selectedReport.status.replace('_', ' ')}</div>
                          <div><strong>Urgency:</strong> {selectedReport.urgency}</div>
                          <div><strong>Waste Type:</strong> {selectedReport.wasteType}</div>
                          {selectedReport.address && (
                            <div><strong>Address:</strong> {selectedReport.address}</div>
                          )}
                          <div><strong>Date:</strong> {new Date(selectedReport.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  )}
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">
            Tips for Better Reporting
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <Camera className="w-5 h-5 text-primary-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Take Clear Photos</h4>
                <p className="text-sm text-gray-600">
                  Ensure good lighting and capture the waste clearly for better AI classification.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-primary-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Accurate Location</h4>
                <p className="text-sm text-gray-600">
                  Enable GPS for precise location or manually adjust the pin on the map.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-primary-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Set Urgency</h4>
                <p className="text-sm text-gray-600">
                  Mark critical issues like hazardous waste or overflowing bins as high priority.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <TrendingUp className="w-5 h-5 text-primary-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Track Progress</h4>
                <p className="text-sm text-gray-600">
                  Monitor your reports and see the positive impact you're making.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
