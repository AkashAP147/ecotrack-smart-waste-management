import mongoose from 'mongoose';
import Report from '../models/Report';
import config from '../config';

(async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri || process.env.MONGO_URI || '', {
      // @ts-ignore
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Delete all reports
    const result = await Report.deleteMany({});
    console.log(`Deleted ${result.deletedCount} reports.`);
    process.exit(0);
  } catch (err) {
    console.error('Error clearing reports:', err);
    process.exit(1);
  }
})();
