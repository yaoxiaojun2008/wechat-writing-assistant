#!/usr/bin/env node
/**
 * 使用环境配置和图片目录中的图片测试微信素材上传和草稿创建流程
 * This is a TypeScript implementation mirroring the Python test_image_upload_workflow.py
 */

// Load environment variables FIRST before any other imports
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });

// Now import other modules after environment is loaded
import * as fs from 'fs';
import * as path from 'path';

// Dynamically import wechatService after environment is loaded
let wechatService;
(async () => {
  const { wechatService: service } = await import('./backend/src/services/wechatService.js');
  wechatService = service;
})();

// Get configuration from environment variables
const WECHAT_APP_ID = process.env.WECHAT_APP_ID;
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET;

if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
  console.log("❌ 缺少微信配置信息");
  process.exit(1);
}

console.log(`✅ 使用配置: AppID: ${WECHAT_APP_ID}`);

class ImageUploadWorkflow {
  async runWorkflow(): Promise<void> {
    console.log("🚀 开始测试使用环境配置和图片目录的素材上传和草稿创建流程");
    console.log("=".repeat(70));

    // Get all image files from img directory
    const imgDir = path.join(process.cwd(), 'img');
    if (!fs.existsSync(imgDir)) {
      console.log(`❌ 图片目录不存在: ${imgDir}`);
      return;
    }

    const imageFiles = fs.readdirSync(imgDir)
      .filter(file => 
        ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].some(ext => 
          file.toLowerCase().endsWith(ext)
        )
      );

    if (imageFiles.length === 0) {
      console.log("❌ 图片目录中没有找到图片文件");
      return;
    }

    console.log(`📁 找到 ${imageFiles.length} 个图片文件`);

    // Only test first 3 images
    for (let i = 0; i < Math.min(3, imageFiles.length); i++) {
      const imgFile = imageFiles[i];
      const imgPath = path.join(imgDir, imgFile);

      console.log(`\n--- 处理第 ${i + 1} 张图片: ${imgFile} ---`);

      try {
        // Step 2: Upload cover image (permanent material)
        console.log(`🖼️ 正在上传永久图片素材: ${imgPath}`);
        const thumbMediaId = await wechatService.uploadPermanentImage(imgPath);
        console.log(`✅ 永久图片素材上传成功，ID: ${thumbMediaId}`);

        // Step 3: Upload content image
        console.log(`🖼️ 正在上传图文消息图片: ${imgPath}`);
        const contentImageUrl = await wechatService.uploadContentImage(imgPath);
        console.log(`✅ 图文消息图片上传成功，URL: ${contentImageUrl}`);

        // Step 4: Create draft with images
        const contentWithImg = `<p>这是一篇使用图片 ${imgFile} 创建的测试草稿内容。</p><p>内容中的图片:</p><img src='${contentImageUrl}' alt='内容图片'><p>这是图片之后的内容。</p>`;
        const title = `测试草稿 - ${imgFile}`;
        
        console.log(`📝 正在创建草稿: ${title}`);
        const result = await wechatService.createDraftWithImages(
          title, 
          contentWithImg, 
          thumbMediaId, 
          '测试作者', 
          '这是一段摘要'
        );
        
        if (result) {
          console.log(`✅ 草稿创建成功！草稿ID: ${result}`);
        } else {
          console.log("💥 草稿创建失败");
        }
        
        console.log(`--- ${imgFile} 处理完成 ---`);
      } catch (error) {
        console.error(`💥 处理图片 ${imgFile} 时出错:`, error);
        continue;
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("📊 素材上传和草稿创建流程测试完成");
    console.log("=".repeat(70));
  }
}

// Run the workflow
async function runImageUploadWorkflow(): Promise<void> {
  try {
    // Wait for wechatService to be loaded
    while (!wechatService) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const workflow = new ImageUploadWorkflow();
    await workflow.runWorkflow();
  } catch (error) {
    console.error('❌ 工作流程执行失败:', error);
  }
}

// Execute
runImageUploadWorkflow();