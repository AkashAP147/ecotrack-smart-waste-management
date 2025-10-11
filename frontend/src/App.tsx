import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, initializeAuth } from '@/store/authStore';

// Layout components
import Layout from '@/components/Layout';
import AuthLayout from '@/components/AuthLayout';

// Pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import ReportForm from '@/pages/ReportForm';
import MyReports from '@/pages/MyReports';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminUsers from '@/pages/AdminUsers';
import AdminReports from '@/pages/AdminReports';
import Analytics from '@/pages/Analytics';
import CollectorDashboard from '@/pages/CollectorDashboard';
import CollectorReports from '@/pages/CollectorReports';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';

// Components
import LoadingSpinner from '@/components/LoadingSpinner';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';

function App() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    // Initialize authentication state
    initializeAuth();
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading EcoTrack...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      
      {/* Auth routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthLayout>
              <Login />
            </AuthLayout>
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthLayout>
              <Register />
            </AuthLayout>
          )
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/report/new"
        element={
          <ProtectedRoute>
            <Layout>
              <ReportForm />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <MyReports />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout>
              <AdminUsers />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout>
              <AdminReports />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/analytics"
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout>
              <Analytics />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Collector routes */}
      <Route
        path="/collector"
        element={
          <ProtectedRoute requiredRole="collector">
            <Layout>
              <CollectorDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/collector/reports"
        element={
          <ProtectedRoute requiredRole="collector">
            <Layout>
              <CollectorReports />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Catch all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </ErrorBoundary>
  );
}

export default App;
