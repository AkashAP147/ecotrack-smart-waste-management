import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  MapPin, 
  Camera, 
  Users, 
  Recycle, 
  Shield, 
  Smartphone,
  CheckCircle
} from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: Camera,
      title: 'Smart Reporting',
      description: 'Take a photo and our AI automatically identifies waste type and urgency level.',
    },
    {
      icon: MapPin,
      title: 'Location Tracking',
      description: 'GPS-enabled reporting with interactive maps for precise waste location.',
    },
    {
      icon: Users,
      title: 'Efficient Collection',
      description: 'Optimized routes for collectors with real-time status updates.',
    },
    {
      icon: Shield,
      title: 'Admin Dashboard',
      description: 'Comprehensive management tools for administrators and supervisors.',
    },
  ];

  const stats = [
    { number: '10K+', label: 'Reports Processed' },
    { number: '500+', label: 'Active Users' },
    { number: '50+', label: 'Collectors' },
    { number: '95%', label: 'Collection Rate' },
  ];

  const benefits = [
    'Real-time waste reporting and tracking',
    'AI-powered waste type classification',
    'Optimized collection routes',
    'Environmental impact monitoring',
    'Community engagement platform',
    'Data-driven insights and analytics',
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ET</span>
              </div>
              <span className="text-xl font-bold text-gray-900">EcoTrack</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="btn btn-primary"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 to-primary-100 py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
              Smart Waste Management for{' '}
              <span className="text-gradient">Cleaner Cities</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Report waste, track collection, and contribute to a sustainable future with 
              our AI-powered waste management platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="btn btn-primary btn-lg inline-flex items-center"
              >
                Start Reporting
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="btn btn-outline btn-lg"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How EcoTrack Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform streamlines waste management through intelligent reporting, 
              efficient collection, and comprehensive tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Making a Real Impact
            </h2>
            <p className="text-lg text-primary-100 max-w-2xl mx-auto">
              Join thousands of users who are already making their communities cleaner and more sustainable.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-primary-100">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Why Choose EcoTrack?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Our comprehensive platform provides everything you need for effective 
                waste management, from reporting to collection to analytics.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-strong p-8">
                <div className="flex items-center space-x-4 mb-6">
                  <Smartphone className="w-12 h-12 text-primary-600" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Mobile-First Design
                    </h3>
                    <p className="text-gray-600">
                      Report waste on the go with our responsive web app
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Photo Upload</span>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">GPS Location</span>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">AI Classification</span>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <Recycle className="w-16 h-16 text-primary-600 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join our community of environmentally conscious citizens and help create cleaner, 
            more sustainable communities for everyone.
          </p>
          <Link
            to="/register"
            className="btn btn-primary btn-lg inline-flex items-center"
          >
            Get Started Today
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">ET</span>
                </div>
                <span className="text-xl font-bold">EcoTrack</span>
              </div>
              <p className="text-gray-400 mb-4">
                Smart waste management for cleaner, more sustainable communities.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/features" className="hover:text-white">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link to="/api" className="hover:text-white">API</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link to="/privacy" className="hover:text-white">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 EcoTrack. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
