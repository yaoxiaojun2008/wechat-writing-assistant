import { wechatService } from './backend/src/services/wechatService.js';

async function testImageProcessing() {
  console.log('🚀 开始测试WeChat服务的图片处理功能...');

  try {
    // 设置环境变量以启用真实API（如果需要）
    process.env.USE_REAL_WECHAT_API = 'false';
    process.env.NODE_ENV = 'development';
    
    // 设置微信配置
    wechatService.updateConfig({
      appId: process.env.WECHAT_APP_ID || 'wx7829dcea67e05a04',
      appSecret: process.env.WECHAT_APP_SECRET || '878b604f3c2b32c4a918b406c089c543'
    });

    // 1. 测试获取账号能力
    console.log('\n🔍 测试获取账号能力...');
    const capabilities = await wechatService.checkAccountCapabilities();
    console.log('✅ 账号能力测试成功:', capabilities);

    // 2. 测试保存包含图片的草稿
    console.log('\n📝 测试保存包含图片的草稿...');
    
    // 模拟包含图片的HTML内容
    const draftContent = `
      <p>这是一篇测试草稿内容。</p>
      <p>下面是测试图片:</p>
      <img src="http://example.com/test.jpg" alt="测试图片">
      <p>更多内容...</p>
      <img src="http://example.com/second-image.png" alt="第二张图片">
      <p>内容结束。</p>
    `;
    const draftTitle = '包含图片的测试草稿';
    
    const draftId = await wechatService.saveToDraft(draftContent, draftTitle);
    console.log('✅ 包含图片的草稿保存测试成功，返回ID:', draftId);

    // 3. 测试获取草稿列表
    console.log('\n📋 测试获取草稿列表...');
    const drafts = await wechatService.getDraftList();
    console.log('✅ 草稿列表获取成功，返回草稿数量:', drafts.length);

    if (drafts.length > 0) {
      console.log('📄 第一个草稿信息:', {
        id: drafts[0].id,
        title: drafts[0].title,
        content: drafts[0].content.substring(0, 100) + '...' // 只显示前100个字符
      });
    }

    console.log('\n🎉 WeChat服务图片处理功能测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testImageProcessing();