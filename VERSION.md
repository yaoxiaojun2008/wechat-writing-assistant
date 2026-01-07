# WeChat Writing Assistant - Version 1.0

## 版本信息
- **版本号**: 1.0 (稳定版)
- **发布日期**: 2026年1月7日
- **版本类型**: 本地运行环境 (Local Runtime)
- **技术栈**: Vite + Express + TypeScript

## 技术架构
- **前端**: React 18 + TypeScript，使用 Vite 构建工具
- **UI库**: Material-UI (MUI)
- **后端**: Node.js + Express + TypeScript
- **状态管理**: React Context + React Query
- **类型安全**: 全栈 TypeScript 保障

## 核心功能
- 语音输入：利用浏览器 Web Speech API 实现语音录制与实时转文字
- AI编辑：集成多种AI服务（DeepSeek、OpenAI、Google Gemini）对文本进行智能优化
- 内容管理：提供富文本编辑器，支持草稿实时保存和版本历史追溯
- 微信集成：直接调用微信公众号API管理草稿箱、获取发布状态
- 定时发布：支持设置未来时间自动发布文章到公众号
- 安全认证：基于JWT的会话认证机制保障用户数据安全

## 项目特色
- 前后端分离架构，Vite + Express 高性能开发体验
- 支持Docker容器化部署
- 无状态JWT认证，适配无服务器部署环境
- 全面的错误处理机制，确保系统稳定性

## 环境配置
- 前端运行端口: http://localhost:3000
- 后端API端口: http://localhost:3001
- 默认密码: 通过环境变量 DEFAULT_PASSWORD 配置
- 支持Mock模式和真实微信API模式

## 运行命令
- 启动全部服务: `npm run dev`
- 单独启动前端: `npm run dev:frontend`
- 单独启动后端: `npm run dev:backend`