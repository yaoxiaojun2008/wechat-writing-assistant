import * as dotenv from 'dotenv';
import { wechatService } from './backend/src/services/wechatService.js';

// 加载环境变量
dotenv.config({ path: './.env' });

// 设置使用真实API
process.env.USE_REAL_WECHAT_API = 'true';

async function testRealDraftCreation() {
  console.log('🚀 开始测试真实微信API创建草稿...');

  try {
    // 1. 检查账号能力
    console.log('\n🔍 检查账号能力...');
    const capabilities = await wechatService.checkAccountCapabilities();
    console.log('✅ 账号能力:', capabilities);

    // 2. 直接使用已知成功的方法创建草稿
    console.log('\n📝 测试创建草稿...');
    
    // 这里我们不直接调用saveToDraft，而是按照成功测试中的方式
    // 先上传素材，再创建草稿
    const draftContent = '<p>这是一篇使用真实微信API创建的草稿内容。</p><p>内容图片:</p><img src="http://mmbiz.qpic.cn/sz_mmbiz_jpg/rw5dhaNBpyvlBfqQ8Vvia3dCADJZUicoeQwTyIricNl7AbjFdgqzx" alt="内容图片"><p>这是图片之后的内容。</p>';
    const draftTitle = '真实API测试草稿';
    
    try {
      const draftId = await wechatService.saveToDraft(draftContent, draftTitle);
      console.log('✅ 草稿创建成功，ID:', draftId);
    } catch (error) {
      console.log('❌ 草稿创建失败:', error.message);
    }

    // 3. 获取草稿列表
    console.log('\n📋 获取草稿列表...');
    try {
      const drafts = await wechatService.getDraftList();
      console.log('✅ 草稿列表获取成功，数量:', drafts.length);
      
      if (drafts.length > 0) {
        console.log('📄 最新草稿:', {
          id: drafts[0].id,
          title: drafts[0].title,
          createdAt: drafts[0].createdAt
        });
      }
    } catch (error) {
      console.log('❌ 获取草稿列表失败:', error.message);
    }

    console.log('\n🎉 真实微信API草稿创建测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testRealDraftCreation();