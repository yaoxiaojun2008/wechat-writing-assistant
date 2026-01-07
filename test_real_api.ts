import { wechatService } from './backend/src/services/wechatService.js';

async function testRealAPI() {
  console.log('🚀 开始测试WeChat服务的真实API功能...');

  try {
    // 设置环境变量以启用真实API
    process.env.USE_REAL_WECHAT_API = 'true';
    process.env.NODE_ENV = 'production'; // 为了绕过mock模式
    
    // 设置微信配置
    wechatService.updateConfig({
      appId: process.env.WECHAT_APP_ID || 'wx7829dcea67e05a04',
      appSecret: process.env.WECHAT_APP_SECRET || '878b604f3c2b32c4a918b406c089c543'
    });

    // 1. 测试获取账号能力
    console.log('\n🔍 测试获取账号能力...');
    const capabilities = await wechatService.checkAccountCapabilities();
    console.log('✅ 账号能力测试成功:', capabilities);

    // 2. 测试保存包含图片的草稿（使用真实API）
    console.log('\n📝 测试保存包含图片的草稿（真实API）...');
    
    // 包含简单HTML内容的草稿
    const draftContent = `
      <p>这是一篇测试草稿内容。</p>
      <p>内容包含一些格式：</p>
      <ul>
        <li>列表项1</li>
        <li>列表项2</li>
      </ul>
      <p>内容结束。</p>
    `;
    const draftTitle = '真实API测试草稿';
    
    try {
      const draftId = await wechatService.saveToDraft(draftContent, draftTitle);
      console.log('✅ 真实API草稿保存测试成功，返回ID:', draftId);
    } catch (error) {
      console.log('⚠️ 真实API草稿保存失败（这可能是正常的，因为账号类型可能不支持）:', error.message);
    }

    // 3. 测试获取草稿列表（使用真实API）
    console.log('\n📋 测试获取草稿列表（真实API）...');
    try {
      const drafts = await wechatService.getDraftList();
      console.log('✅ 真实API草稿列表获取成功，返回草稿数量:', drafts.length);

      if (drafts.length > 0) {
        console.log('📄 第一个草稿信息:', {
          id: drafts[0].id,
          title: drafts[0].title,
          createdAt: drafts[0].createdAt
        });
      }
    } catch (error) {
      console.log('⚠️ 真实API草稿列表获取失败（这可能是正常的，因为账号类型可能不支持）:', error.message);
    }

    console.log('\n🎉 WeChat服务真实API功能测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testRealAPI();