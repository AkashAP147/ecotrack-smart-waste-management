# EcoTrack Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Railway (Recommended for Full-Stack)

1. **Push to GitHub** (if not already done)
2. **Connect to Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "Deploy from GitHub repo"
   - Select your EcoTrack repository
   - Railway will auto-detect and deploy both frontend and backend

3. **Set Environment Variables:**
   ```
   NODE_ENV=production
   MONGODB_URI=your_atlas_connection_string
   JWT_SECRET=your_secure_jwt_secret
   JWT_REFRESH_SECRET=your_secure_refresh_secret
   CORS_ORIGIN=https://your-frontend-domain.railway.app
   ```

### Option 2: Netlify (Frontend) + Render (Backend)

#### Frontend to Netlify:
1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop the `frontend/dist` folder
   - Or connect GitHub repo with build settings:
     - Build command: `cd frontend && npm run build`
     - Publish directory: `frontend/dist`

3. **Set Environment Variables in Netlify:**
   ```
   REACT_APP_API_URL=https://your-backend.onrender.com
   ```

#### Backend to Render:
1. **Connect GitHub to Render:**
   - Go to [render.com](https://render.com)
   - Create new "Web Service"
   - Connect your GitHub repository

2. **Configure Build Settings:**
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && node real-server.js`
   - Environment: Node

3. **Set Environment Variables:**
   ```
   NODE_ENV=production
   MONGODB_URI=your_atlas_connection_string
   JWT_SECRET=your_secure_jwt_secret
   JWT_REFRESH_SECRET=your_secure_refresh_secret
   CORS_ORIGIN=https://your-frontend.netlify.app
   ```

### Option 3: Vercel (Frontend) + Railway (Backend)

#### Frontend to Vercel:
1. **Connect GitHub to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set root directory to `frontend`

2. **Configure Build Settings:**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

#### Backend to Railway:
- Follow Railway steps from Option 1

## 🔧 Pre-Deployment Checklist

### ✅ Frontend Configuration
- [ ] Update `REACT_APP_API_URL` to production backend URL
- [ ] Build succeeds without errors (`npm run build`)
- [ ] All environment variables are prefixed with `REACT_APP_`

### ✅ Backend Configuration
- [ ] MongoDB Atlas connection string is ready
- [ ] JWT secrets are secure (not development keys)
- [ ] CORS origin points to frontend domain
- [ ] File upload path is configured for production
- [ ] Health check endpoint (`/health`) is working

### ✅ Database
- [ ] MongoDB Atlas cluster is running
- [ ] IP whitelist includes `0.0.0.0/0` or deployment platform IPs
- [ ] Database is seeded with initial data (optional)

## 🌐 Environment Variables

### Frontend (.env)
```
REACT_APP_API_URL=https://your-backend-domain.com
REACT_APP_APP_NAME=EcoTrack
REACT_APP_APP_VERSION=1.0.0
```

### Backend (.env)
```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ecotrack
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key
CORS_ORIGIN=https://your-frontend-domain.com
```

## 🔍 Testing Deployment

1. **Health Check:** Visit `https://your-backend-domain.com/health`
2. **Frontend:** Visit your frontend URL
3. **API Test:** Try logging in with test credentials
4. **Database:** Verify data persistence

## 📞 Support

If you encounter issues:
1. Check deployment logs on your hosting platform
2. Verify environment variables are set correctly
3. Ensure MongoDB Atlas is accessible
4. Check CORS configuration

## 🎯 Production Recommendations

1. **Security:**
   - Use strong JWT secrets
   - Enable HTTPS
   - Configure proper CORS origins

2. **Performance:**
   - Enable gzip compression
   - Use CDN for static assets
   - Optimize images

3. **Monitoring:**
   - Set up error tracking
   - Monitor API performance
   - Database connection monitoring
