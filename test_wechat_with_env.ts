import * as dotenv from 'dotenv';
import axios from 'axios';

// 首先加载环境变量
dotenv.config({ path: './.env' });

console.log('✅ 检查环境变量:');
console.log('WECHAT_APP_ID:', process.env.WECHAT_APP_ID ? '已设置' : '未设置');
console.log('WECHAT_APP_SECRET:', process.env.WECHAT_APP_SECRET ? '已设置' : '未设置');
console.log('USE_REAL_WECHAT_API:', process.env.USE_REAL_WECHAT_API || '未设置');

// 现在导入wechatService，此时环境变量应该已经被设置了
import { wechatService } from './backend/src/services/wechatService.js';

async function testWeChatWithEnv() {
  console.log('\n🚀 开始测试已加载环境变量的微信服务...');

  try {
    // 1. 检查账号能力
    console.log('\n🔍 检查账号能力...');
    const capabilities = await wechatService.checkAccountCapabilities();
    console.log('✅ 账号能力:', capabilities);

    // 2. 测试使用图片URL创建草稿
    console.log('\n📝 测试使用图片URL创建草稿...');
    
    const contentWithImageUrl = '<p>这是一篇使用图片URL创建的草稿内容。</p><p>内容图片:</p><img src="http://mmbiz.qpic.cn/sz_mmbiz_jpg/rw5dhaNBpyvlBfqQ8Vvia3dCADJZUicoeQwTyIricNl7AbjFdgqzx" alt="内容图片"><p>这是图片之后的内容。</p>';
    const draftTitle = '环境变量测试草稿';
    
    try {
      const draftId = await wechatService.saveToDraft(contentWithImageUrl, draftTitle);
      console.log('✅ 使用图片URL的草稿创建成功，ID:', draftId);
    } catch (error) {
      console.log('❌ 使用图片URL的草稿创建失败:', error.message);
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

    console.log('\n🎉 环境变量微信服务测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testWeChatWithEnv();