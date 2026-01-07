import { wechatService } from './backend/src/services/wechatService.js';

async function testPersonalAccount() {
  console.log('🚀 开始测试个人订阅号微信服务...');

  try {
    // 1. 测试获取账号能力
    console.log('\n🔍 测试获取账号能力...');
    const capabilities = await wechatService.checkAccountCapabilities();
    console.log('✅ 账号能力测试结果:', capabilities);

    // 2. 测试在模拟模式下保存草稿
    console.log('\n📝 测试在模拟模式下保存草稿...');
    process.env.USE_REAL_WECHAT_API = 'false';
    process.env.NODE_ENV = 'development';
    
    const draftContent = '<p>这是一篇测试草稿内容。</p><p>包含图片测试:</p><img src="http://example.com/test.jpg" alt="测试图片"><p>内容结束。</p>';
    const draftTitle = '个人订阅号测试草稿标题';
    
    const draftId = await wechatService.saveToDraft(draftContent, draftTitle);
    console.log('✅ 模拟模式下草稿保存测试成功，返回ID:', draftId);

    // 3. 测试在模拟模式下获取草稿列表
    console.log('\n📋 测试在模拟模式下获取草稿列表...');
    const drafts = await wechatService.getDraftList();
    console.log('✅ 模拟模式下草稿列表获取成功，返回草稿数量:', drafts.length);

    if (drafts.length > 0) {
      console.log('📄 第一个草稿信息:', {
        id: drafts[0].id,
        title: drafts[0].title,
        createdAt: drafts[0].createdAt
      });
    }

    // 4. 测试真实API模式下保存草稿（如果配置了有效的微信凭证）
    console.log('\n📝 测试真实API模式下保存草稿...');
    process.env.USE_REAL_WECHAT_API = 'true';
    process.env.NODE_ENV = 'development';
    
    try {
      const realDraftId = await wechatService.saveToDraft(draftContent, draftTitle);
      console.log('✅ 真实API模式下草稿保存测试成功，返回ID:', realDraftId);
    } catch (error) {
      console.log('⚠️ 真实API模式下草稿保存遇到错误（这可能是正常的，因为可能缺少有效的微信凭证）:', error.message);
    }

    // 5. 测试发布功能（预期会失败）
    console.log('\n📤 测试发布功能（预期会失败）...');
    try {
      const publishResult = await wechatService.publishArticle('some-draft-id', {
        targetAudience: 'all',
        enableComments: true,
        enableSharing: true
      });
      console.log('⚠️ 意外：发布功能成功，返回结果:', publishResult);
    } catch (error) {
      console.log('✅ 预期：发布功能失败（个人订阅号不支持），错误信息:', error.message);
    }

    console.log('\n🎉 个人订阅号微信服务测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testPersonalAccount();