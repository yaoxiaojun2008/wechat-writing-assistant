# WeChat Writing Assistant - Vercel Compatible Version

## 版本信息
- **基础版本**: 1.0 (稳定版)
- **适配版本**: Vercel兼容版
- **技术栈**: Vite + Vercel Serverless Functions + TypeScript
- **目的**: 使应用能够在Vercel平台上顺利部署

## 架构变更

### 传统架构 (本地开发)
- 前端: Vite (localhost:3000)
- 后端: Express (localhost:3001)
- 通信: RESTful API

### Vercel兼容架构
- 前端: Vite (部署在Vercel边缘网络)
- 后端: Vercel Serverless Functions (替代Express)
- 通信: Vercel Functions API路由

## 主要技术调整

### 1. API路由适配
- 将Express路由转换为Vercel Functions
- 创建`/api`路由处理器
- 保持API接口一致性

### 2. 环境变量处理
- Vercel项目环境变量通过Dashboard配置
- 保持与本地开发相同的变量名

### 3. 认证机制
- 使用JWT进行无状态认证
- 适配Vercel Functions的生命周期

### 4. 静态资源处理
- 图片上传等操作适配Vercel Functions限制
- 考虑使用Vercel Blob或外部存储服务

## 文件结构

```
frontend/
├── api/                    # Vercel Serverless Functions
│   ├── [...path].js        # 通用API路由处理器
│   ├── auth/
│   │   └── [...path].js    # 认证相关API
│   ├── wechat/
│   │   └── [...path].js    # 微信相关API
│   ├── content/
│   │   └── [...path].js    # 内容编辑相关API
│   └── voice/
│       └── [...path].js    # 语音相关API
├── src/
│   └── ...                 # 前端源码保持不变
└── vercel.json             # Vercel部署配置
```

## 部署说明

### 本地开发
```bash
npm run dev  # 启动完整的前后端开发环境
```

### Vercel部署
1. 将仓库连接到Vercel
2. 设置环境变量
3. Vercel自动检测并使用`vercel.json`配置

### 部署配置 (vercel.json)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## 功能兼容性

| 功能 | 本地开发 | Vercel部署 |
|------|----------|------------|
| 用户认证 | ✅ | ✅ |
| 语音输入 | ✅ | ✅ |
| AI编辑 | ✅ | ✅ |
| 微信集成 | ✅ | ✅ |
| 内容管理 | ✅ | ✅ |
| 定时发布 | ✅ | ⚠️ (需额外配置) |

## 注意事项

1. **冷启动**: Serverless函数存在冷启动延迟，对性能敏感的功能可能受影响
2. **执行时间限制**: Vercel Functions最大执行时间为10秒（Pro计划为60秒）
3. **文件大小限制**: 部署包大小有限制
4. **定时任务**: 需要使用外部服务（如Cron-job.org）替代node-cron

## 维护策略

- 主分支保持本地开发版本
- 创建`vercel-compatible`分支用于Vercel部署版本
- 通过合并请求同步公共代码更改
- 保持API接口的一致性