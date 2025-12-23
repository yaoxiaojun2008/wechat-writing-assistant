# 微信公众号写作助手 - 项目初始化脚本 (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "微信公众号写作助手 - 项目初始化脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js 是否安装
Write-Host "检查 Node.js 安装状态..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "[成功] Node.js 已安装: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[错误] Node.js 未安装或未添加到 PATH" -ForegroundColor Red
    Write-Host "请访问 https://nodejs.org/ 下载并安装 Node.js" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

# 检查 npm 是否可用
Write-Host "检查 npm 安装状态..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "[成功] npm 已安装: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[错误] npm 不可用" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

Write-Host ""

# 安装根目录依赖
Write-Host "安装根目录依赖..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] 根目录依赖安装失败" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

# 安装前端依赖
Write-Host "安装前端依赖..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] 前端依赖安装失败" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

# 安装后端依赖
Write-Host "安装后端依赖..." -ForegroundColor Yellow
Set-Location ..\backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] 后端依赖安装失败" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

Set-Location ..

# 复制环境变量文件
Write-Host "复制环境变量配置文件..." -ForegroundColor Yellow
if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "[成功] 已创建 backend\.env" -ForegroundColor Green
} else {
    Write-Host "[跳过] backend\.env 已存在" -ForegroundColor Yellow
}

if (-not (Test-Path "frontend\.env")) {
    Copy-Item "frontend\.env.example" "frontend\.env"
    Write-Host "[成功] 已创建 frontend\.env" -ForegroundColor Green
} else {
    Write-Host "[跳过] frontend\.env 已存在" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "项目初始化完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步操作：" -ForegroundColor Yellow
Write-Host "1. 编辑 backend\.env 配置必要的环境变量" -ForegroundColor White
Write-Host "2. 确保 Redis 服务正在运行" -ForegroundColor White
Write-Host "3. 运行 'npm run dev' 启动开发服务器" -ForegroundColor White
Write-Host ""
Write-Host "详细说明请查看 SETUP.md 文件" -ForegroundColor Cyan
Write-Host ""
Read-Host "按任意键退出"