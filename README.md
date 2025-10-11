# EcoTrack - Smart Waste Management System

A full-stack web application for efficient waste management with user reporting, admin management, and collector coordination.

## Features

- **User Features**: Register/login, report waste with photos and location, view personal reports
- **Admin Features**: View all reports, assign collectors, manage system
- **Collector Features**: View assigned pickups, mark as collected, optimized routing
- **ML Integration**: Waste type classification (stub implementation)
- **Real-time Updates**: FCM notifications for status changes
- **Map Integration**: Interactive maps with OpenStreetMap/Leaflet

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Leaflet
- **Backend**: Node.js + Express + TypeScript + MongoDB + JWT
- **Storage**: Local file storage (dev) + AWS S3 (prod ready)
- **Notifications**: Firebase Cloud Messaging
- **Containerization**: Docker + Docker Compose

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB (or use Docker)

### Local Development with Docker

1. **Clone and setup**:
```bash
git clone <repo-url>
cd EcoTrack
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. **Start all services**:
```bash
docker-compose up -d
```

3. **Seed sample data**:
```bash
cd backend
npm run seed
```

4. **Access the application**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

### Manual Development Setup

#### Backend Setup
```bash
cd backend
npm install
npm run dev
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ecotrack
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_BUCKET_NAME=your-s3-bucket
AWS_REGION=us-east-1
FIREBASE_SERVICE_ACCOUNT_KEY=path/to/firebase-key.json
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_MAP_TILER_KEY=optional-maptiler-key
```

## API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token

### Reports
- `POST /api/report` - Create new waste report
- `GET /api/report` - Get all reports (admin/collector)
- `GET /api/report/me` - Get user's reports
- `PUT /api/report/:id/assign` - Assign collector (admin)
- `PUT /api/report/:id/status` - Update status

### Collector
- `GET /api/collector/:id/route` - Get optimized pickup route

### ML Classification
- `POST /api/ml/predict` - Predict waste type from image

## Sample Usage Flow

1. **User Registration**:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123","phone":"+1234567890"}'
```

2. **Create Report**:
```bash
curl -X POST http://localhost:5000/api/report \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@waste-image.jpg" \
  -F "lat=40.7128" \
  -F "lng=-74.0060" \
  -F "description=Overflowing trash bin"
```

3. **Admin Assign Collector**:
```bash
curl -X PUT http://localhost:5000/api/report/REPORT_ID/assign \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"collectorId":"COLLECTOR_ID"}'
```

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Production Deployment

### Build for Production
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Docker Production Build
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Switching to Google Maps

To use Google Maps instead of OpenStreetMap:

1. Get Google Maps API key from Google Cloud Console
2. Add to frontend/.env: `REACT_APP_GOOGLE_MAPS_KEY=your-key`
3. Replace `MapPicker` component imports from `leaflet` to `@googlemaps/react-wrapper`
4. Update MapPicker component in `src/components/MapPicker.tsx`

## Firebase Cloud Messaging Setup

1. Create Firebase project at https://console.firebase.google.com
2. Generate service account key JSON
3. Add path to backend/.env: `FIREBASE_SERVICE_ACCOUNT_KEY=path/to/key.json`
4. For Android client, add `google-services.json` to your Android project

## Sample Test Users

After running `npm run seed`:

- **Admin**: admin@ecotrack.com / admin123
- **Collector**: collector@ecotrack.com / collector123
- **User**: user@ecotrack.com / user123

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## License

MIT License - see LICENSE file for details.
