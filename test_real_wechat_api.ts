import * as dotenv from 'dotenv';
import { wechatService } from './backend/src/services/wechatService.js';

// 加载环境变量
dotenv.config({ path: './.env' });

async function testRealWeChatAPI() {
  console.log('🚀 开始测试真实微信API...');

  // 检查环境变量
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  
  console.log(`📋 检查环境变量:`);
  console.log(`   WECHAT_APP_ID: ${appId ? '已配置' : '缺失'}`);
  console.log(`   WECHAT_APP_SECRET: ${appSecret ? '已配置' : '缺失'}`);

  if (!appId || !appSecret) {
    console.log('⚠️  缺少微信API配置，将使用模拟模式进行测试');
    process.env.USE_REAL_WECHAT_API = 'false';
  } else {
    console.log('✅ 微信API配置已找到，将使用真实API进行测试');
    process.env.USE_REAL_WECHAT_API = 'true';
  }

  try {
    // 1. 测试获取账号能力
    console.log('\n🔍 测试获取账号能力...');
    const capabilities = await wechatService.checkAccountCapabilities();
    console.log('✅ 账号能力测试结果:', capabilities);

    // 2. 测试保存草稿
    console.log('\n📝 测试保存草稿...');
    const draftContent = '<p>这是一篇测试草稿内容。</p><p>包含图片测试:</p><img src="http://example.com/test.jpg" alt="测试图片"><p>内容结束。</p>';
    const draftTitle = '真实API测试草稿标题';
    
    try {
      const draftId = await wechatService.saveToDraft(draftContent, draftTitle);
      console.log('✅ 草稿保存测试成功，返回ID:', draftId);
    } catch (error) {
      console.log('❌ 草稿保存测试失败:', error.message);
    }

    // 3. 测试获取草稿列表
    console.log('\n📋 测试获取草稿列表...');
    try {
      const drafts = await wechatService.getDraftList();
      console.log('✅ 草稿列表获取成功，返回草稿数量:', drafts.length);

      if (drafts.length > 0) {
        console.log('📄 第一个草稿信息:', {
          id: drafts[0].id,
          title: drafts[0].title,
          createdAt: drafts[0].createdAt
        });
      }
    } catch (error) {
      console.log('❌ 草稿列表获取失败:', error.message);
    }

    // 4. 测试发布功能（预期会因权限失败）
    console.log('\n📤 测试发布功能...');
    try {
      const publishResult = await wechatService.publishArticle('some-draft-id', {
        targetAudience: 'all',
        enableComments: true,
        enableSharing: true
      });
      console.log('✅ 发布功能成功，返回结果:', publishResult);
    } catch (error) {
      console.log('❌ 发布功能失败:', error.message);
    }

    console.log('\n🎉 真实微信API测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testRealWeChatAPI();