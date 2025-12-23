# 项目设置指南 (Windows)

## 前置要求

在开始之前，您需要安装以下软件：

### 1. 安装 Node.js 和 npm

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 LTS 版本 (推荐 18.x 或更高版本)
3. 运行安装程序，确保勾选 "Add to PATH" 选项
4. 安装完成后，重启命令提示符或 PowerShell

验证安装：
```cmd
node --version
npm --version
```

### 2. 安装 Redis (可选，用于开发)

**选项 A: 使用 Windows Subsystem for Linux (WSL)**
```bash
# 在 WSL 中安装 Redis
sudo apt update
sudo apt install redis-server
```

**选项 B: 使用 Docker Desktop**
```cmd
# 安装 Docker Desktop 后运行
docker run -d -p 6379:6379 redis:7-alpine
```

**选项 C: 使用云服务**
- 使用 Redis Cloud 或其他云 Redis 服务

## 项目初始化步骤

### 1. 安装依赖

```cmd
# 在项目根目录运行
npm install

# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ..\backend
npm install

# 返回根目录
cd ..
```

### 2. 环境配置

1. 复制环境变量文件：
```cmd
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

2. 编辑 `backend\.env` 文件，配置必要的环境变量：
```env
NODE_ENV=development
PORT=3001
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-key-here
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
OPENAI_API_KEY=your-openai-api-key
```

### 3. 启动开发服务器

```cmd
# 启动所有服务（前端 + 后端）
npm run dev

# 或者分别启动
npm run dev:frontend  # 前端: http://localhost:3000
npm run dev:backend   # 后端: http://localhost:3001
```

## 常见问题解决

### 问题 1: npm 命令不识别
- 确保 Node.js 已正确安装并添加到 PATH
- 重启命令提示符或 PowerShell
- 尝试使用完整路径：`C:\Program Files\nodejs\npm.exe`

### 问题 2: Redis 连接失败
- 确保 Redis 服务正在运行
- 检查 `backend\.env` 中的 REDIS_URL 配置
- 如果使用 Docker，确保容器正在运行

### 问题 3: 端口被占用
- 修改 `backend\.env` 中的 PORT 配置
- 或者停止占用端口的其他程序

### 问题 4: 权限问题
- 以管理员身份运行命令提示符
- 或者使用 `npm config set prefix` 设置全局安装目录

## 开发工具推荐

### 代码编辑器
- **Visual Studio Code** (推荐)
  - 安装扩展：TypeScript, ESLint, Prettier, Thunder Client

### 浏览器开发工具
- Chrome DevTools
- React Developer Tools 扩展

### API 测试工具
- Thunder Client (VS Code 扩展)
- Postman
- Insomnia

## 下一步

项目初始化完成后，您可以：

1. 查看 `README.md` 了解项目详情
2. 查看 `.kiro/specs/wechat-writing-assistant/tasks.md` 了解开发任务
3. 开始实现具体功能模块

## 获取帮助

如果遇到问题：
1. 检查控制台错误信息
2. 查看日志文件 `backend/logs/`
3. 参考项目文档和注释
4. 搜索相关错误信息