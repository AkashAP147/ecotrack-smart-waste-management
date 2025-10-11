const mongoose = require('mongoose');

const uri = 'mongodb+srv://harishnaik3252_db_user:Harish123@cluster0.fnm8itm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function testConnection() {
  try {
    console.log('🔗 Attempting to connect to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('✅ MongoDB Atlas connection successful!');
    
    // Test creating a simple document
    const testSchema = new mongoose.Schema({ name: String, createdAt: Date });
    const TestModel = mongoose.model('Test', testSchema);
    
    const testDoc = new TestModel({ name: 'EcoTrack Test', createdAt: new Date() });
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

testConnection();
