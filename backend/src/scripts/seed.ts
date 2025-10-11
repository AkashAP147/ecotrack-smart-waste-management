import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Report from '../models/Report';
import config from '../config';

// Sample data
const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@ecotrack.com',
    password: 'admin123',
    phone: '+1234567890',
    role: 'admin',
    isActive: true,
    isVerified: true,
  },
  {
    name: 'John Collector',
    email: 'collector@ecotrack.com',
    password: 'collector123',
    phone: '+1234567891',
    role: 'collector',
    isActive: true,
    isVerified: true,
  },
  {
    name: 'Jane User',
    email: 'user@ecotrack.com',
    password: 'user123',
    phone: '+1234567892',
    role: 'user',
    isActive: true,
    isVerified: true,
  },
  {
    name: 'Bob Collector',
    email: 'bob.collector@ecotrack.com',
    password: 'collector123',
    phone: '+1234567893',
    role: 'collector',
    isActive: true,
    isVerified: true,
  },
  {
    name: 'Alice User',
    email: 'alice.user@ecotrack.com',
    password: 'user123',
    phone: '+1234567894',
    role: 'user',
    isActive: true,
    isVerified: true,
  },
];

const sampleReports = [
  {
    photo: 'sample-plastic-bottles.jpg',
    location: {
      type: 'Point',
      coordinates: [-74.0060, 40.7128], // New York City
    },
    address: '123 Main St, New York, NY 10001',
    wasteType: 'plastic',
    description: 'Multiple plastic bottles scattered near the bus stop',
    urgency: 'medium',
    status: 'pending',
    estimatedQuantity: '5-10 bottles',
  },
  {
    photo: 'sample-food-waste.jpg',
    location: {
      type: 'Point',
      coordinates: [-74.0070, 40.7138],
    },
    address: '456 Park Ave, New York, NY 10002',
    wasteType: 'organic',
    description: 'Food waste from restaurant, attracting pests',
    urgency: 'high',
    status: 'pending',
    estimatedQuantity: '2-3 bags',
  },
  {
    photo: 'sample-electronic-waste.jpg',
    location: {
      type: 'Point',
      coordinates: [-74.0050, 40.7118],
    },
    address: '789 Broadway, New York, NY 10003',
    wasteType: 'electronic',
    description: 'Old computer monitor and cables dumped illegally',
    urgency: 'medium',
    status: 'pending',
    estimatedQuantity: '1 monitor, several cables',
  },
  {
    photo: 'sample-mixed-trash.jpg',
    location: {
      type: 'Point',
      coordinates: [-74.0080, 40.7148],
    },
    address: '321 5th Ave, New York, NY 10004',
    wasteType: 'mixed',
    description: 'Overflowing public trash bin with mixed waste',
    urgency: 'critical',
    status: 'pending',
    estimatedQuantity: 'Large bin overflow',
  },
  {
    photo: 'sample-glass-bottles.jpg',
    location: {
      type: 'Point',
      coordinates: [-74.0040, 40.7108],
    },
    address: '654 Wall St, New York, NY 10005',
    wasteType: 'glass',
    description: 'Broken glass bottles near playground - safety hazard',
    urgency: 'high',
    status: 'pending',
    estimatedQuantity: '3-4 broken bottles',
  },
];

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Report.deleteMany({});
    console.log('🗑️  Cleared existing data');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
};

const seedUsers = async () => {
  try {
    const users = [];
    
    for (const userData of sampleUsers) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      const user = new User({
        ...userData,
        password: hashedPassword,
      });
      
      users.push(user);
    }
    
    const savedUsers = await User.insertMany(users);
    console.log(`✅ Created ${savedUsers.length} users`);
    return savedUsers;
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};

const seedReports = async (users: any[]) => {
  try {
    const userRole = users.find(u => u.role === 'user');
    const aliceUser = users.find(u => u.email === 'alice.user@ecotrack.com');
    
    const reports = sampleReports.map((reportData, index) => {
      // Alternate between users for variety
      const user = index % 2 === 0 ? userRole : aliceUser;
      
      return new Report({
        ...reportData,
        user: user._id,
      });
    });
    
    const savedReports = await Report.insertMany(reports);
    console.log(`✅ Created ${savedReports.length} reports`);
    return savedReports;
  } catch (error) {
    console.error('❌ Error seeding reports:', error);
    throw error;
  }
};

const assignSomeReports = async (users: any[], reports: any[]) => {
  try {
    const collector = users.find(u => u.role === 'collector');
    const bobCollector = users.find(u => u.email === 'bob.collector@ecotrack.com');
    
    // Assign first 2 reports to John Collector
    await Report.findByIdAndUpdate(reports[0]._id, {
      assignedCollector: collector._id,
      status: 'assigned',
      assignedAt: new Date(),
    });
    
    await Report.findByIdAndUpdate(reports[1]._id, {
      assignedCollector: collector._id,
      status: 'in_progress',
      assignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    });
    
    // Assign one report to Bob Collector and mark as collected
    await Report.findByIdAndUpdate(reports[2]._id, {
      assignedCollector: bobCollector._id,
      status: 'collected',
      assignedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      collectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      actualQuantity: '1 monitor, 3 cables',
      collectorNotes: 'Successfully collected electronic waste. Disposed at certified e-waste facility.',
    });
    
    console.log('✅ Assigned collectors to some reports');
  } catch (error) {
    console.error('❌ Error assigning reports:', error);
    throw error;
  }
};

const printSummary = (users: any[], reports: any[]) => {
  console.log('\n📊 Seeding Summary:');
  console.log('==================');
  console.log(`👥 Users created: ${users.length}`);
  console.log('   - 1 Admin (admin@ecotrack.com / admin123)');
  console.log('   - 2 Collectors (collector@ecotrack.com, bob.collector@ecotrack.com / collector123)');
  console.log('   - 2 Regular Users (user@ecotrack.com, alice.user@ecotrack.com / user123)');
  console.log(`📋 Reports created: ${reports.length}`);
  console.log('   - Various waste types and urgency levels');
  console.log('   - Some assigned to collectors with different statuses');
  console.log('\n🚀 You can now:');
  console.log('   1. Login with any of the test accounts');
  console.log('   2. Test the admin dashboard');
  console.log('   3. Test collector workflows');
  console.log('   4. Create new reports as users');
  console.log('\n💡 API Base URL: http://localhost:5000/api');
  console.log('💡 Health Check: http://localhost:5000/health');
};

const seed = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data
    await clearDatabase();
    
    // Seed users
    const users = await seedUsers();
    
    // Seed reports
    const reports = await seedReports(users);
    
    // Assign some reports to collectors
    await assignSomeReports(users, reports);
    
    // Print summary
    printSummary(users, reports);
    
    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seed();
}

export default seed;
