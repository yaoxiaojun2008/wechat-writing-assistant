# WeChat Writing Assistant - Vercel Deployment Guide

## Overview

This guide explains how to deploy the WeChat Writing Assistant application to Vercel, maintaining compatibility with the existing local development version.

## Prerequisites

- A GitHub/GitLab/Bitbucket account with the project repository
- WeChat Official Account credentials (optional, for full functionality)
- API keys for AI services (DeepSeek, OpenAI, etc.)

## Deployment Scenarios

There are two recommended approaches for deploying this application:

### Approach 1: Separated Deployment (Recommended)

Deploy the frontend to Vercel and the backend to another platform (like Render, Railway, or AWS):

#### Frontend (Vercel)
- Deploy to Vercel with `VITE_API_URL` pointing to your backend server
- Configure in Vercel Dashboard: `VITE_API_URL=https://your-backend-server.com/api`

#### Backend (Separate Platform)
- Deploy to a platform that supports long-running Node.js processes
- Configure `FRONTEND_URL` to point to your Vercel frontend URL
- Example: `FRONTEND_URL=https://your-project.vercel.app`

### Approach 2: Vercel-Only Deployment (With Limitations)

Convert the backend to Vercel Serverless Functions (as implemented in this project):

- All API routes are converted to Vercel Functions
- Frontend remains on Vercel
- Backend runs as Serverless Functions on Vercel
- Some limitations due to serverless nature (cold starts, execution timeouts)

## Deployment Steps

### 1. Prepare Your Repository

1. Push all changes to your Git repository
2. Ensure the `vercel.json` file is in the project root
3. Make sure environment variables are properly configured

### 2. Deploy to Vercel

#### Option A: Connect Vercel to GitHub

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project" and select your repository
3. Vercel will automatically detect the project as a static frontend with API routes
4. Configure build settings:
   - Framework Preset: `Other Static Generate`
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/dist`
   - Root Directory: `/`

#### Option B: CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to project root
cd c:/AIStartup_2025dec/kiro/weixin

# Link to your Vercel project
vercel

# Follow the prompts to set up the project
```

### 3. Configure Environment Variables

Based on your deployment approach:

#### For Separated Deployment (Recommended):

**Frontend on Vercel:**
Add these environment variables in the Vercel dashboard under Settings > Environment Variables:
- `VITE_API_URL`: The URL of your backend server (e.g., `https://your-backend.onrender.com/api`)

**Backend on Separate Platform:**
Configure these environment variables on your backend hosting platform:
- `FRONTEND_URL`: The URL of your Vercel frontend (e.g., `https://your-project.vercel.app`)
- `DEFAULT_PASSWORD`: The default password for login (default: `Admin!234`)
- `JWT_SECRET`: Secret key for JWT token signing
- `WECHAT_APP_ID`: Your WeChat Official Account App ID (optional)
- `WECHAT_APP_SECRET`: Your WeChat Official Account App Secret (optional)
- `AI_PROVIDER`: Which AI provider to use (e.g., `deepseek`, `openai`)
- `DEEPSEEK_API_KEY`: DeepSeek API key
- `OPENAI_API_KEY`: OpenAI API key (if using OpenAI)

#### For Vercel-Only Deployment:

Add the following environment variables in the Vercel dashboard under Settings > Environment Variables:

- `DEFAULT_PASSWORD`: The default password for login (default: `Admin!234`)
- `JWT_SECRET`: Secret key for JWT token signing
- `WECHAT_APP_ID`: Your WeChat Official Account App ID (optional)
- `WECHAT_APP_SECRET`: Your WeChat Official Account App Secret (optional)
- `AI_PROVIDER`: Which AI provider to use (e.g., `deepseek`, `openai`)
- `DEEPSEEK_API_KEY`: DeepSeek API key
- `OPENAI_API_KEY`: OpenAI API key (if using OpenAI)
- `BACKEND_URL`: URL of a separate backend instance (if proxying to external service)
- `VITE_API_URL`: Set to `/api` since API routes are handled internally

### 4. Build and Deploy

Once configured, Vercel will automatically build and deploy your application. The build process includes:

1. Installing frontend dependencies
2. Building the React application with Vite
3. Setting up API routes for server-side functionality

## Vercel-Specific Implementation Details

### API Routes

The application uses Vercel's Serverless Functions feature to handle API requests:

- `frontend/api/auth/[...path].js` - Handles authentication
- `frontend/api/content/[...path].js` - Manages content editing
- `frontend/api/voice/[...path].js` - Processes voice input
- `frontend/api/wechat/[...path].js` - Interfaces with WeChat API

### State Management

Since Vercel Functions are stateless, the application uses:

- JWT tokens for authentication
- Client-side storage for temporary data
- External services for persistent data storage

### Limitations

- Cold start delays for API functions
- 10-second timeout for Hobby plan (60 seconds for Pro)
- 50MB max bundle size
- No persistent local file storage

## Differences from Local Development Version

| Feature | Local Dev | Vercel Deploy |
|---------|-----------|---------------|
| Backend | Separate Express server | Serverless Functions |
| Database | Local/External DB | External services only |
| File Storage | Local filesystem | Vercel Blob or external |
| Cron Jobs | node-cron | External scheduling service |
| Sessions | Server memory | JWT tokens |

## Troubleshooting

### Common Issues

1. **404 Errors for API Routes**
   - Verify `vercel.json` routes are properly configured
   - Check that API route files are in the correct location

2. **Environment Variables Not Loading**
   - Confirm variables are set in Vercel Dashboard
   - Ensure variable names match exactly

3. **API Timeout Errors**
   - Optimize API function performance
   - Consider upgrading to Pro plan for longer execution time

4. **CORS Issues in Separated Deployment**
   - Ensure `FRONTEND_URL` is correctly set in backend
   - Make sure `VITE_API_URL` points to the correct backend

### Debugging

- Monitor logs in Vercel Dashboard > Logs
- Use `vercel logs` command for CLI log access
- Add console.log statements to API functions for debugging

## Maintaining Both Versions

The codebase maintains compatibility with both versions:

- **Local Development**: Full-featured with separate backend
- **Vercel Deployment**: Optimized for serverless architecture

Changes made to shared logic (frontend components, business logic) will benefit both versions. API implementations may differ based on the deployment environment.

## Rollback Plan

If issues occur in the Vercel deployment:

1. Access Vercel Dashboard
2. Navigate to the project
3. Go to Deployments
4. Select a previous successful deployment
5. Click "Promote" to revert to that version

## Support

For issues specific to Vercel deployment, contact Vercel support. For application-specific issues, refer to the project documentation.