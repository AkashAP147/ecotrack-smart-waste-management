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

const printSummary = (users: any[]) => {
  console.log('\n📊 Seeding Summary:');
  console.log('==================');
  console.log(`👥 Users created: ${users.length}`);
  console.log('   - 1 Admin (admin@ecotrack.com / admin123)');
  console.log('   - 2 Collectors (collector@ecotrack.com, bob.collector@ecotrack.com / collector123)');
  console.log('   - 2 Regular Users (user@ecotrack.com, alice.user@ecotrack.com / user123)');
  console.log(`📋 Reports created: 0`);
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
    // Print summary
    printSummary(users);
    
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
