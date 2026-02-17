import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Plus, 
  FileText, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Shield,
  Truck,
  BarChart3,
  Bell,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(new Date());
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastSync(new Date());
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update sync time periodically
    const syncInterval = setInterval(() => {
      if (isOnline) {
        setLastSync(new Date());
      }
    }, 30000); // Update every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, [isOnline]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      roles: ['user', 'admin', 'collector'],
    },
    {
      name: 'New Report',
      href: '/report/new',
      icon: Plus,
      roles: ['user'],
    },
    {
      name: 'My Reports',
      href: '/reports',
      icon: FileText,
      roles: ['user'],
    },
    {
      name: 'Admin Panel',
      href: '/admin',
      icon: Shield,
      roles: ['admin'],
    },
    {
      name: 'Manage Users',
      href: '/admin/users',
      icon: Shield,
      roles: ['admin'],
    },
    {
      name: 'All Reports',
      href: '/admin/reports',
      icon: FileText,
      roles: ['admin'],
    },
    {
      name: 'Collector Panel',
      href: '/collector',
      icon: Truck,
      roles: ['collector'],
    },
    {
      name: 'All Reports',
      href: '/collector/reports',
      icon: FileText,
      roles: ['collector'],
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      roles: ['admin'],
    },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || 'user')
  );

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:relative lg:h-screen lg:w-64 xl:w-72",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">ET</span>
            </div>
            <span className="text-xl font-bold text-gray-900">EcoTrack</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "nav-link",
                  isActive(item.href) ? "nav-link-active" : "nav-link-inactive"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role}
              </p>
            </div>
          </div>
          
          <div className="space-y-1">
            <Link
              to="/profile"
              className={cn(
                "nav-link text-sm",
                isActive('/profile') ? "nav-link-active" : "nav-link-inactive"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <Settings className="w-4 h-4 mr-3" />
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="nav-link nav-link-inactive text-sm w-full text-left"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-2 py-2 sm:px-4 lg:px-6 xl:px-8 lg:rounded-tr-2xl xl:rounded-tr-3xl w-full">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex-1 lg:flex lg:items-center lg:justify-between">
              <div className="hidden lg:block">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {getPageTitle(location.pathname)}
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Connection Status */}
                <div className="flex items-center space-x-2">
                  {isOnline ? (
                    <div className="flex items-center space-x-1 text-green-600">
                      <Wifi className="w-4 h-4" />
                      <span className="text-xs hidden sm:inline">Online</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-red-600">
                      <WifiOff className="w-4 h-4" />
                      <span className="text-xs hidden sm:inline">Offline</span>
                    </div>
                  )}
                </div>

                {/* Sync Status */}
                <div className="hidden md:flex items-center space-x-1 text-xs text-gray-500">
                  <RefreshCw className="w-3 h-3" />
                  <span>Synced {lastSync.toLocaleTimeString()}</span>
                </div>

                {/* Notifications */}
                <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User Welcome */}
                <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                  <span>Welcome back, {user?.name?.split(' ')[0]}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="px-2 py-4 sm:px-4 lg:px-6 xl:px-8 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/report/new': 'Create New Report',
    '/reports': 'My Reports',
    '/profile': 'Profile Settings',
    '/admin': 'Admin Dashboard',
    '/admin/users': 'User Management',
    '/admin/reports': 'All Reports',
    '/collector': 'Collector Dashboard',
    '/collector/reports': 'All Reports',
    '/analytics': 'Analytics',
  };
  
  return titles[pathname] || 'EcoTrack';
}

export default Layout;
