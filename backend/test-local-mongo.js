const mongoose = require('mongoose');

const localUri = 'mongodb://localhost:27017/ecotrack';

async function testLocalConnection() {
  try {
    console.log('🔗 Attempting to connect to local MongoDB...');
    await mongoose.connect(localUri);
    console.log('✅ Local MongoDB connection successful!');
    
    // Test creating a simple document
    const testSchema = new mongoose.Schema({ name: String, createdAt: Date });
    const TestModel = mongoose.model('Test', testSchema);
    
    const testDoc = new TestModel({ name: 'EcoTrack Local Test', createdAt: new Date() });
    await testDoc.save();
    console.log('✅ Test document created successfully!');
    
    // Clean up
    await TestModel.deleteMany({});
    console.log('✅ Test document cleaned up');
    
    await mongoose.connection.close();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testLocalConnection();
