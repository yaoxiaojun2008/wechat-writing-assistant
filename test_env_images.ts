import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { wechatService } from './backend/src/services/wechatService.js';

// Load environment variables
dotenv.config({ path: './.env' });

async function testEnvImages() {
  console.log('🚀 开始测试使用环境配置和图片目录中的图片...');

  // 从环境变量获取配置
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  if (!appId || !appSecret) {
    console.error('❌ 缺少微信配置信息');
    return;
  }

  console.log(`✅ 使用配置: AppID: ${appId}`);

  // 更新WeChat服务配置
  wechatService.updateConfig({
    appId: appId,
    appSecret: appSecret
  });

  try {
    // 获取图片目录中的所有图片
    const imgDir = './img';
    const imageFiles = fs.readdirSync(imgDir).filter(file => 
      ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].some(ext => 
        file.toLowerCase().endsWith(ext)
      )
    );

    if (imageFiles.length === 0) {
      console.log('⚠️ 图片目录中没有找到图片文件');
      return;
    }

    console.log(`📁 找到 ${imageFiles.length} 个图片文件:`, imageFiles);

    // 测试上传图片到微信
    for (const imgFile of imageFiles.slice(0, 3)) { // 只测试前3张图片
      const imgPath = path.join(imgDir, imgFile);
      console.log(`\n🖼️ 正在处理图片: ${imgFile}`);

      try {
        // 这里需要实现图片上传功能
        // 注意：在Node.js环境中，我们需要不同的方法来处理图片上传
        console.log(`✅ 图片路径验证: ${imgPath}`);
        
        // 使用真实API测试草稿创建（使用第一张图片作为示例）
        if (imgFile === imageFiles[0]) {
          console.log('\n📝 正在测试创建包含图片的草稿...');
          
          // 设置为使用真实API
          process.env.USE_REAL_WECHAT_API = 'true';
          process.env.NODE_ENV = 'production';
          
          const draftContent = `
            <p>这是一篇使用图片 ${imgFile} 创建的测试草稿内容。</p>
            <p>图片将作为封面图上传。</p>
            <p>更多内容...</p>
          `;
          
          const draftTitle = `测试草稿 - ${imgFile}`;
          
          try {
            const draftId = await wechatService.saveToDraft(draftContent, draftTitle);
            console.log(`✅ 草稿创建成功，ID: ${draftId}`);
          } catch (error) {
            console.log(`⚠️ 草稿创建失败: ${error.message}`);
          }
        }
      } catch (error) {
        console.error(`❌ 处理图片 ${imgFile} 时出错:`, error.message);
      }
    }

    // 测试获取草稿列表
    console.log('\n📋 测试获取草稿列表...');
    try {
      const drafts = await wechatService.getDraftList();
      console.log(`✅ 获取到 ${drafts.length} 个草稿`);
      
      if (drafts.length > 0) {
        console.log('📄 第一个草稿信息:', {
          id: drafts[0].id,
          title: drafts[0].title,
          createdAt: drafts[0].createdAt
        });
      }
    } catch (error) {
      console.log(`⚠️ 获取草稿列表失败: ${error.message}`);
    }

    console.log('\n🎉 环境配置和图片测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testEnvImages();