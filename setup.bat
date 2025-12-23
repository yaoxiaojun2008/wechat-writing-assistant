@echo off
echo ========================================
echo 微信公众号写作助手 - 项目初始化脚本
echo ========================================
echo.

REM 检查 Node.js 是否安装
echo 检查 Node.js 安装状态...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Node.js 未安装或未添加到 PATH
    echo 请访问 https://nodejs.org/ 下载并安装 Node.js
    pause
    exit /b 1
)

echo [成功] Node.js 已安装
node --version

REM 检查 npm 是否可用
echo 检查 npm 安装状态...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] npm 不可用
    pause
    exit /b 1
)

echo [成功] npm 已安装
npm --version
echo.

REM 安装根目录依赖
echo 安装根目录依赖...
npm install
if %errorlevel% neq 0 (
    echo [错误] 根目录依赖安装失败
    pause
    exit /b 1
)

REM 安装前端依赖
echo 安装前端依赖...
cd frontend
npm install
if %errorlevel% neq 0 (
    echo [错误] 前端依赖安装失败
    pause
    exit /b 1
)

REM 安装后端依赖
echo 安装后端依赖...
cd ..\backend
npm install
if %errorlevel% neq 0 (
    echo [错误] 后端依赖安装失败
    pause
    exit /b 1
)

cd ..

REM 复制环境变量文件
echo 复制环境变量配置文件...
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env"
    echo [成功] 已创建 backend\.env
) else (
    echo [跳过] backend\.env 已存在
)

if not exist "frontend\.env" (
    copy "frontend\.env.example" "frontend\.env"
    echo [成功] 已创建 frontend\.env
) else (
    echo [跳过] frontend\.env 已存在
)

echo.
echo ========================================
echo 项目初始化完成！
echo ========================================
echo.
echo 下一步操作：
echo 1. 编辑 backend\.env 配置必要的环境变量
echo 2. 确保 Redis 服务正在运行
echo 3. 运行 'npm run dev' 启动开发服务器
echo.
echo 详细说明请查看 SETUP.md 文件
echo.
pause