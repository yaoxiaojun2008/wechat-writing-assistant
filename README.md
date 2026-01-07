# 微信公众号写作助手

一个集成语音输入、AI编辑、内容管理和定时发布功能的Web应用程序，帮助用户通过语音快速创建文章内容，利用AI进行内容优化，并直接管理微信公众号的草稿和发布流程。

## 功能特性

- 🎤 **语音输入**: 支持浏览器原生语音录制和转文字
- 🤖 **AI编辑**: 集成OpenAI GPT、Gemini、Deepseek进行智能文本编辑和优化
- 📝 **内容管理**: 富文本编辑器，支持实时保存和版本管理
- 📱 **微信集成**: 直接管理微信公众号草稿，发布需要权限，目前未开通。
- ⏰ **定时发布**: 支持文章定时发布功能
- 🔐 **安全认证**: 基于会话的用户认证系统

## 技术栈

### 前端

- React 18 + TypeScript
- Material-UI (MUI)
- Vite
- React Query
- WebRTC API

### 后端

- Node.js + Express
- TypeScript
- Redis
- Winston (日志)
- JWT (认证)

### 外部服务

- 微信公众号API
- OpenAI GPT-4 API
- Web Speech API/local speech module

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Redis >= 6.0

### 安装依赖

```bash
# 安装所有依赖
npm run install:all

# 或者分别安装
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 环境配置

1. 复制环境变量模板：
   
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. 配置后端环境变量 (`backend/.env`)：
   
   ```env
   NODE_ENV=development
   PORT=3001
   JWT_SECRET=your-jwt-secret-key
   WECHAT_APP_ID=your-wechat-app-id
   WECHAT_APP_SECRET=your-wechat-app-secret
   OPENAI_API_KEY=your-openai-api-key
   DEEPSEEK_API_KEY= your_deepseek_key
   ...
   ```

### 启动开发服务器

```bash
# 启动所有服务（前端 + 后端）
npm run dev

# 或者分别启动
npm run dev:frontend  # 前端: http://localhost:3000
npm run dev:backend   # 后端: http://localhost:3001
```



## 开发指南

### 项目结构

```
wechat-writing-assistant/
├── frontend/                 # React前端应用
│   ├── src/
│   │   ├── components/      # React组件
│   │   ├── services/        # API服务
│   │   ├── types/          # TypeScript类型定义
│   │   └── utils/          # 工具函数
│   └── package.json
├── backend/                 # Node.js后端应用
│   ├── src/
│   │   ├── routes/         # API路由
│   │   ├── services/       # 业务逻辑服务
│   │   ├── middleware/     # Express中间件
│   │   ├── types/          # TypeScript类型定义
│   │   └── utils/          # 工具函数
│   └── package.json
└── package.json            # 根项目配置
```

### 可用脚本

```bash
# 开发
npm run dev                  # 启动开发服务器
npm run dev:frontend         # 仅启动前端
npm run dev:backend          # 仅启动后端

# 构建
npm run build               # 构建所有项目
npm run build:frontend      # 构建前端
npm run build:backend       # 构建后端

# 测试
npm run test               # 运行所有测试
npm run test:frontend      # 运行前端测试
npm run test:backend       # 运行后端测试

# 代码质量
npm run lint               # 运行ESLint检查
npm run format             # 格式化代码
```

### API文档

API服务运行在 `http://localhost:3001`

- `GET /health` - 健康检查
- `GET /api` - API状态检查

更多API端点将在后续开发中添加。

## 部署

### 生产环境部署

1. 构建项目：
   
   ```bash
   npm run build
   ```

2. 配置生产环境变量

3. 启动服务：
   
   ```bash
   cd backend && npm start
   ```

# 2026-01-06修改

简化结构，去掉Reidis和docker功能，以便快速部署。

完善微信上传草稿的功能。

微信的草稿上传流程：先传图片到永久素材库获得media_id, 在提交草稿时构造关联url, 提交草稿。



## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至项目维护者

---

**注意**: 本项目仍在开发中，功能可能会有变化。请关注更新日志了解最新变化。


# WeChat Writing Assistant

A comprehensive web application for content creators to enhance article creation efficiency through voice input and AI-assisted editing, with seamless integration to WeChat Official Accounts platform.

## Version Information

**Current Stable Release: Version 1.0**

- **Technology Stack**: Vite + Express + TypeScript
- **Release Type**: Local Runtime Environment
- **Architecture**: Frontend-Backend Separation
- **Features**: Voice Input, AI Editing, Content Management, WeChat Integration

For detailed version information, see [VERSION.md](./VERSION.md).

## Vercel Compatible Version

We have also created a Vercel-compatible version that allows deployment to Vercel's serverless infrastructure:

- **Architecture**: Static frontend with Vercel Serverless Functions
- **Benefits**: Fast global CDN, auto-scaling, zero-config deployments
- **Compatibility**: Maintains all core functionality with adaptations for serverless constraints

To learn more about the Vercel compatible version, see [VERSION_VERCEL.md](./VERSION_VERCEL.md).

For deployment instructions to Vercel, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md).

## How the Frontend Discovers Backend URL

The frontend application discovers the backend API URL through the `VITE_API_URL` environment variable:

- **Local Development**: Points to the backend server (typically `http://localhost:3001/api`)
- **Vercel Deployment**: Depends on the deployment strategy:
  - **Separated Deployment**: Points to the external backend server (e.g., `https://your-backend.onrender.com/api`)
  - **Vercel-Only Deployment**: Uses relative path (`/api`) to access Vercel Serverless Functions

In Vercel deployments, this environment variable must be configured in the Vercel project settings to ensure the frontend knows where to send API requests.

## Features

- 🎤 **Voice Input**: Utilizes browser Web Speech API for voice recording and real-time conversion to text
- 🤖 **AI Editing**: Integrates multiple AI services (DeepSeek, OpenAI, Google Gemini) for intelligent text optimization
- 📝 **Content Management**: Provides rich text editor with real-time draft saving and version history tracking
- 📱 **WeChat Integration**: Directly connects to WeChat Official Account API for draft management and publishing status
- ⏰ **Scheduled Publishing**: Supports setting future times for automatic article publishing
- 🔐 **Secure Authentication**: JWT-based session authentication mechanism for data security

## Tech Stack

- **Frontend**: React 18 + TypeScript, built with Vite
- **UI Library**: Material-UI (MUI)
- **Backend**: Node.js + Express + TypeScript
- **State Management**: React Context + React Query
- **Type Safety**: Full-stack TypeScript for type safety

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Redis >= 6.0 (optional, for advanced features)
- Docker (optional, for containerized deployment)

## Getting Started

1. Clone the repository
2. Install dependencies for both frontend and backend:

```bash
# In project root
npm install
cd frontend && npm install
cd ../backend && npm install
```

3. Configure environment variables in `.env` files
4. Start the development servers:

```bash
# From project root to start both servers
npm run dev

# Or separately
npm run dev:frontend  # Runs on http://localhost:3000
npm run dev:backend   # Runs on http://localhost:3001
```

## Environment Variables

Create `.env` files in both frontend and backend directories with appropriate configurations.

Example backend `.env`:
```
# Server Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Authentication
DEFAULT_PASSWORD=Admin!234
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
SESSION_SECRET=wechat-session-secret-key-2024-development-only

# WeChat API Configuration
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
USE_REAL_WECHAT_API=false

# AI Configuration
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-deepseek-api-key
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo
```

Example frontend `.env`:
```
# API Configuration
# For local development: point to your backend server
# VITE_API_URL=http://localhost:3001/api

# For production deployment on Vercel with separate backend:
# Replace with your actual backend server URL
# VITE_API_URL=https://your-backend-domain.com/api

# For Vercel deployment with Serverless Functions (all-in-one):
# Use relative path to point to Vercel Functions
VITE_API_URL=/api
```

## Project Structure

```
weixin/
├── frontend/              # React/Vite frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   └── services/      # Service functions
│   ├── public/
│   └── package.json
├── backend/               # Express/Node.js backend
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic services
│   │   ├── middleware/    # Express middleware
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript type definitions
│   ├── package.json
└── README.md
```

## Deployment

### Local Development Deployment

For local development, use the traditional setup:

```bash
# From project root to start both servers
npm run dev

# Or separately
npm run dev:frontend  # Runs on http://localhost:3000
npm run dev:backend   # Runs on http://localhost:3001
```

### Production Deployment (Traditional)

For production deployment with traditional architecture, build the frontend and start the backend:

```bash
# Build frontend
cd frontend && npm run build

# Start backend
cd backend && npm start
```

### Vercel Deployment

For deployment to Vercel's serverless platform:

1. Ensure your repository is connected to Vercel
2. Add environment variables to your Vercel project settings
3. Configure the build settings as described in [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

## License

This project is licensed under the MIT License.

```
