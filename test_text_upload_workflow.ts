#!/usr/bin/env node
/**
 * 测试纯文本草稿创建流程（不使用图片）
 * This script tests basic draft creation without image uploads
 */

// Load environment variables FIRST before any other imports
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });

// Now import other modules after environment is loaded
import * as path from 'path';

// Get configuration from environment variables
const WECHAT_APP_ID = process.env.WECHAT_APP_ID;
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET;

if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
  console.log("❌ 缺少微信配置信息");
  process.exit(1);
}

console.log(`✅ 使用配置: AppID: ${WECHAT_APP_ID}`);

class TextUploadWorkflow {
  private wechatService: any;

  constructor(wechatService: any) {
    this.wechatService = wechatService;
  }

  async runWorkflow(): Promise<void> {
    console.log("🚀 开始测试纯文本草稿创建流程");
    console.log("=".repeat(70));

    try {
      const title = "测试文本草稿 - 纯文字";
      const content = `<p>这是一篇纯文本测试草稿内容，没有使用任何图片。</p>
                      <p>测试日期: ${new Date().toLocaleString()}</p>
                      <p>这是测试内容的第三段落。</p>`;

      console.log(`📝 正在创建纯文本草稿: ${title}`);
      const result = await this.wechatService.saveToDraft(content, title);
      
      if (result) {
        console.log(`✅ 纯文本草稿创建成功！草稿ID: ${result}`);
      } else {
        console.log("💥 草稿创建失败");
      }
    } catch (error) {
      console.error("💥 创建草稿时出错:", error);
    }

    console.log("\n" + "=".repeat(70));
    console.log("📊 纯文本草稿创建流程测试完成");
    console.log("=".repeat(70));
  }
}

// Run the workflow
async function runTextUploadWorkflow(): Promise<void> {
  try {
    // Dynamically import wechatService after environment is loaded
    const { wechatService } = await import('./backend/src/services/wechatService.js');
    
    const workflow = new TextUploadWorkflow(wechatService);
    await workflow.runWorkflow();
  } catch (error) {
    console.error('❌ 工作流程执行失败:', error);
  }
}

// Execute
runTextUploadWorkflow();