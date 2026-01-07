import { wechatService } from './backend/src/services/wechatService.js';

async function testWeChatServiceDirect() {
  console.log('🚀 开始直接测试WeChat服务...');

  try {
    // 1. 测试获取账号能力
    console.log('\n🔍 测试获取账号能力...');
    const capabilities = await wechatService.checkAccountCapabilities();
    console.log('✅ 账号能力测试成功:', capabilities);

    // 2. 测试保存草稿（使用模拟模式）
    console.log('\n📝 测试保存草稿...');
    
    // 设置环境变量以启用真实API（如果需要）
    process.env.USE_REAL_WECHAT_API = 'false';
    process.env.NODE_ENV = 'development';
    
    const draftContent = '<p>这是一篇测试草稿内容。</p><p>包含图片测试:</p><img src="http://example.com/test.jpg" alt="测试图片"><p>内容结束。</p>';
    const draftTitle = '测试草稿标题';
    
    const draftId = await wechatService.saveToDraft(draftContent, draftTitle);
    console.log('✅ 草稿保存测试成功，返回ID:', draftId);

    // 3. 测试获取草稿列表
    console.log('\n📋 测试获取草稿列表...');
    const drafts = await wechatService.getDraftList();
    console.log('✅ 草稿列表获取成功，返回草稿数量:', drafts.length);

    if (drafts.length > 0) {
      console.log('📄 第一个草稿信息:', {
        id: drafts[0].id,
        title: drafts[0].title,
        createdAt: drafts[0].createdAt
      });
    }

    console.log('\n🎉 WeChat服务直接测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testWeChatServiceDirect();