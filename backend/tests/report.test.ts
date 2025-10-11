import request from 'supertest';
import mongoose from 'mongoose';
import path from 'path';
import app from '../src/server';
import User from '../src/models/User';
import Report from '../src/models/Report';

describe('Report Endpoints', () => {
  let userToken: string;
  let adminToken: string;
  let collectorToken: string;
  let userId: string;
  let adminId: string;
  let collectorId: string;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/ecotrack-test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Report.deleteMany({});

    // Create test users
    const userData = {
      name: 'Test User',
      email: 'user@example.com',
      password: 'password123',
      phone: '+1234567890',
      role: 'user',
    };

    const adminData = {
      name: 'Test Admin',
      email: 'admin@example.com',
      password: 'password123',
      phone: '+1234567891',
      role: 'admin',
    };

    const collectorData = {
      name: 'Test Collector',
      email: 'collector@example.com',
      password: 'password123',
      phone: '+1234567892',
      role: 'collector',
    };

    // Register users
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);
    
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send(adminData);
    
    const collectorResponse = await request(app)
      .post('/api/auth/register')
      .send(collectorData);

    userToken = userResponse.body.data.accessToken;
    adminToken = adminResponse.body.data.accessToken;
    collectorToken = collectorResponse.body.data.accessToken;
    userId = userResponse.body.data.user._id;
    adminId = adminResponse.body.data.user._id;
    collectorId = collectorResponse.body.data.user._id;
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe('POST /api/report', () => {
    it('should create a report with valid data', async () => {
      const response = await request(app)
        .post('/api/report')
        .set('Authorization', `Bearer ${userToken}`)
        .field('lat', '40.7128')
        .field('lng', '-74.0060')
        .field('description', 'Test waste report description')
        .field('wasteType', 'plastic')
        .field('urgency', 'medium')
        .field('address', '123 Test Street')
        .attach('photo', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.report.description).toBe('Test waste report description');
      expect(response.body.data.report.wasteType).toBe('plastic');
      expect(response.body.data.report.urgency).toBe('medium');
      expect(response.body.data.report.status).toBe('pending');
      expect(response.body.data.report.user).toBe(userId);
    });

    it('should not create report without photo', async () => {
      const response = await request(app)
        .post('/api/report')
        .set('Authorization', `Bearer ${userToken}`)
        .field('lat', '40.7128')
        .field('lng', '-74.0060')
        .field('description', 'Test waste report description')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Photo is required');
    });

    it('should not create report without authentication', async () => {
      const response = await request(app)
        .post('/api/report')
        .field('lat', '40.7128')
        .field('lng', '-74.0060')
        .field('description', 'Test waste report description')
        .attach('photo', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not create report with invalid coordinates', async () => {
      const response = await request(app)
        .post('/api/report')
        .set('Authorization', `Bearer ${userToken}`)
        .field('lat', '200') // Invalid latitude
        .field('lng', '-74.0060')
        .field('description', 'Test waste report description')
        .attach('photo', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not create report with short description', async () => {
      const response = await request(app)
        .post('/api/report')
        .set('Authorization', `Bearer ${userToken}`)
        .field('lat', '40.7128')
        .field('lng', '-74.0060')
        .field('description', 'Short') // Too short
        .attach('photo', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/report', () => {
    beforeEach(async () => {
      // Create test reports
      const reportData = {
        user: userId,
        photo: 'test.jpg',
        location: {
          type: 'Point',
          coordinates: [-74.0060, 40.7128],
        },
        description: 'Test report description',
        wasteType: 'plastic',
        urgency: 'medium',
        status: 'pending',
      };

      await Report.create([
        { ...reportData, description: 'First report' },
        { ...reportData, description: 'Second report', status: 'assigned' },
        { ...reportData, description: 'Third report', urgency: 'high' },
      ]);
    });

    it('should get all reports for admin', async () => {
      const response = await request(app)
        .get('/api/report')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toHaveLength(3);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should get all reports for collector', async () => {
      const response = await request(app)
        .get('/api/report')
        .set('Authorization', `Bearer ${collectorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toBeDefined();
    });

    it('should not get reports for regular user', async () => {
      const response = await request(app)
        .get('/api/report')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should filter reports by status', async () => {
      const response = await request(app)
        .get('/api/report?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reports.every((r: any) => r.status === 'pending')).toBe(true);
    });

    it('should filter reports by urgency', async () => {
      const response = await request(app)
        .get('/api/report?urgency=high')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reports.every((r: any) => r.urgency === 'high')).toBe(true);
    });
  });

  describe('GET /api/report/me', () => {
    beforeEach(async () => {
      // Create test reports for the user
      const reportData = {
        user: userId,
        photo: 'test.jpg',
        location: {
          type: 'Point',
          coordinates: [-74.0060, 40.7128],
        },
        description: 'User report description',
        wasteType: 'plastic',
        urgency: 'medium',
        status: 'pending',
      };

      await Report.create([
        { ...reportData, description: 'User first report' },
        { ...reportData, description: 'User second report' },
      ]);

      // Create report for another user
      await Report.create({
        ...reportData,
        user: adminId,
        description: 'Admin report',
      });
    });

    it('should get only user own reports', async () => {
      const response = await request(app)
        .get('/api/report/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toHaveLength(2);
      expect(response.body.data.reports.every((r: any) => r.user === userId)).toBe(true);
    });

    it('should not get reports without authentication', async () => {
      const response = await request(app)
        .get('/api/report/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/report/:id/assign', () => {
    let reportId: string;

    beforeEach(async () => {
      const report = await Report.create({
        user: userId,
        photo: 'test.jpg',
        location: {
          type: 'Point',
          coordinates: [-74.0060, 40.7128],
        },
        description: 'Test report for assignment',
        wasteType: 'plastic',
        urgency: 'medium',
        status: 'pending',
      });
      reportId = report._id.toString();
    });

    it('should assign collector to report (admin only)', async () => {
      const response = await request(app)
        .put(`/api/report/${reportId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ collectorId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.report.assignedCollector).toBe(collectorId);
      expect(response.body.data.report.status).toBe('assigned');
      expect(response.body.data.report.assignedAt).toBeDefined();
    });

    it('should not assign collector without admin role', async () => {
      const response = await request(app)
        .put(`/api/report/${reportId}/assign`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ collectorId })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should not assign invalid collector', async () => {
      const response = await request(app)
        .put(`/api/report/${reportId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ collectorId: 'invalid-id' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not assign to non-existent report', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .put(`/api/report/${fakeId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ collectorId })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/report/:id/status', () => {
    let reportId: string;

    beforeEach(async () => {
      const report = await Report.create({
        user: userId,
        photo: 'test.jpg',
        location: {
          type: 'Point',
          coordinates: [-74.0060, 40.7128],
        },
        description: 'Test report for status update',
        wasteType: 'plastic',
        urgency: 'medium',
        status: 'assigned',
        assignedCollector: collectorId,
      });
      reportId = report._id.toString();
    });

    it('should update report status by admin', async () => {
      const response = await request(app)
        .put(`/api/report/${reportId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          status: 'in_progress',
          adminNotes: 'Admin updated status'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.report.status).toBe('in_progress');
      expect(response.body.data.report.adminNotes).toBe('Admin updated status');
    });

    it('should update report status by assigned collector', async () => {
      const response = await request(app)
        .put(`/api/report/${reportId}/status`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ 
          status: 'collected',
          collectorNotes: 'Waste collected successfully',
          actualQuantity: '2 bags'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.report.status).toBe('collected');
      expect(response.body.data.report.collectorNotes).toBe('Waste collected successfully');
      expect(response.body.data.report.actualQuantity).toBe('2 bags');
    });

    it('should not update status by regular user', async () => {
      const response = await request(app)
        .put(`/api/report/${reportId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'collected' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should not update with invalid status', async () => {
      const response = await request(app)
        .put(`/api/report/${reportId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/report/statistics', () => {
    beforeEach(async () => {
      // Create test reports with different statuses
      const baseReport = {
        user: userId,
        photo: 'test.jpg',
        location: {
          type: 'Point',
          coordinates: [-74.0060, 40.7128],
        },
        description: 'Test report',
        wasteType: 'plastic',
        urgency: 'medium',
      };

      await Report.create([
        { ...baseReport, status: 'pending' },
        { ...baseReport, status: 'assigned' },
        { ...baseReport, status: 'collected' },
        { ...baseReport, status: 'pending', urgency: 'critical' },
      ]);
    });

    it('should get report statistics for authenticated user', async () => {
      const response = await request(app)
        .get('/api/report/statistics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.overview.totalReports).toBe(4);
      expect(response.body.data.overview.pendingReports).toBe(2);
      expect(response.body.data.overview.assignedReports).toBe(1);
      expect(response.body.data.overview.collectedReports).toBe(1);
      expect(response.body.data.overview.criticalReports).toBe(1);
    });

    it('should not get statistics without authentication', async () => {
      const response = await request(app)
        .get('/api/report/statistics')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
