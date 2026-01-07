 pyt#!/usr/bin/env node
/**
 * 测试微信账号能力检查
 * This script tests WeChat account capabilities
 */

// Load environment variables FIRST before any other imports
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });

// Now import other modules after environment is loaded

// Get configuration from environment variables
const WECHAT_APP_ID = process.env.WECHAT_APP_ID;
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET;

if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
  console.log("❌ 缺少微信配置信息");
  process.exit(1);
}

console.log(`✅ 使用配置: AppID: ${WECHAT_APP_ID}`);

class AccountCapabilitiesTest {
  private wechatService: any;

  constructor(wechatService: any) {
    this.wechatService = wechatService;
  }

  async runTest(): Promise<void> {
    console.log("🚀 开始测试微信账号能力");
    console.log("=".repeat(70));

    try {
      const capabilities = await this.wechatService.checkAccountCapabilities();
      
      console.log("📊 账号能力检查结果:");
      console.log(`   可使用草稿API: ${capabilities.canUseDraftAPI ? '✅ 是' : '❌ 否'}`);
      console.log(`   账号类型: ${capabilities.accountType}`);
      console.log(`   已认证: ${capabilities.isVerified ? '✅ 是' : '❌ 否'}`);
      console.log(`   消息: ${capabilities.message}`);
      
      if (!capabilities.canUseDraftAPI) {
        console.log("\n💡 建议:");
        console.log("   - 确保是已认证的企业服务号，个人订阅号无法使用草稿API");
        console.log("   - 检查微信公众平台是否有相关权限限制");
        console.log("   - 考虑在开发环境中使用模拟模式 (WECHAT_MOCK_MODE=true)");
      }
    } catch (error) {
      console.error("💥 检查账号能力时出错:", error);
    }

    console.log("\n" + "=".repeat(70));
    console.log("📊 账号能力检查完成");
    console.log("=".repeat(70));
  }
}

// Run the test
async function runAccountCapabilitiesTest(): Promise<void> {
  try {
    // Dynamically import wechatService after environment is loaded
    const { wechatService } = await import('./backend/src/services/wechatService.js');
    
    const test = new AccountCapabilitiesTest(wechatService);
    await test.runTest();
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
  }
}

// Execute
runAccountCapabilitiesTest();