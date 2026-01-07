import * as dotenv from 'dotenv';

// 首先加载环境变量
dotenv.config({ path: './.env' });

console.log('✅ 检查环境变量:');
console.log('WECHAT_APP_ID:', process.env.WECHAT_APP_ID ? '已设置' : '未设置');
console.log('WECHAT_APP_SECRET:', process.env.WECHAT_APP_SECRET ? '已设置' : '未设置');
console.log('USE_REAL_WECHAT_API:', process.env.USE_REAL_WECHAT_API || '未设置');

// 现在导入更新后的wechatService
import { wechatService } from './backend/src/services/wechatService.js';

async function testUpdatedWeChatService() {
  console.log('\n🚀 开始测试更新后的微信服务...');

  try {
    // 1. 检查账号能力
    console.log('\n🔍 检查账号能力...');
    const capabilities = await wechatService.checkAccountCapabilities();
    console.log('✅ 账号能力:', capabilities);

    // 2. 如果支持草稿API，尝试创建草稿
    if (capabilities.canUseDraftAPI) {
      console.log('\n📝 测试创建草稿...');
      
      const contentWithImageUrl = '<p>这是一篇使用图片URL创建的草稿内容。</p><p>内容图片:</p><img src="http://mmbiz.qpic.cn/sz_mmbiz_jpg/rw5dhaNBpyvlBfqQ8Vvia3dCADJZUicoeQwTyIricNl7AbjFdgqzx" alt="内容图片"><p>这是图片之后的内容。</p>';
      const draftTitle = '更新服务后测试草稿';
      
      try {
        const draftId = await wechatService.saveToDraft(contentWithImageUrl, draftTitle);
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
    } else {
      console.log('\n⚠️ 账号不支持草稿API，无法进行进一步测试');
    }

    console.log('\n🎉 更新后微信服务测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testUpdatedWeChatService();