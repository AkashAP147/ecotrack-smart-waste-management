// MongoDB initialization script for Docker
// This script runs when the MongoDB container starts for the first time

db = db.getSiblingDB('ecotrack');

// Create collections with indexes
db.createCollection('users');
db.createCollection('reports');
db.createCollection('pickuplogs');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

db.reports.createIndex({ location: '2dsphere' });
db.reports.createIndex({ user: 1, createdAt: -1 });
db.reports.createIndex({ status: 1, createdAt: -1 });
db.reports.createIndex({ assignedCollector: 1, status: 1 });
db.reports.createIndex({ wasteType: 1 });
db.reports.createIndex({ urgency: 1 });

db.pickuplogs.createIndex({ report: 1 });
db.pickuplogs.createIndex({ collector: 1, createdAt: -1 });
db.pickuplogs.createIndex({ status: 1 });
db.pickuplogs.createIndex({ startTime: 1 });

print('EcoTrack database initialized with indexes');
