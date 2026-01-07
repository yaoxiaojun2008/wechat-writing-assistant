import * as dotenv from 'dotenv';
import axios from 'axios';
import * as fs from 'fs';

// 加载环境变量
dotenv.config({ path: './.env' });

async function fullWorkflowTest() {
  console.log('🚀 开始完整工作流测试（上传素材 -> 创建草稿）...');

  try {
    // 1. 获取访问令牌
    console.log('\n🔑 获取访问令牌...');
    const tokenResponse = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
      params: {
        grant_type: 'client_credential',
        appid: process.env.WECHAT_APP_ID,
        secret: process.env.WECHAT_APP_SECRET,
      },
      timeout: 10000,
    });

    if (tokenResponse.data.errcode) {
      throw new Error(`获取访问令牌失败: ${tokenResponse.data.errcode} - ${tokenResponse.data.errmsg}`);
    }

    const accessToken = tokenResponse.data.access_token;
    console.log('✅ 访问令牌获取成功');

    // 2. 上传永久图片素材作为封面图
    console.log('\n🖼️ 上传永久图片素材作为封面图...');
    
    // 读取picture2.jpg文件
    const imagePath = './picture2.jpg';
    if (!fs.existsSync(imagePath)) {
      throw new Error(`图片文件不存在: ${imagePath}`);
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    
    // 创建 FormData 来上传图片
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('media', blob, 'picture2.jpg');
    formData.append('type', 'image');

    try {
      const uploadResponse = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=image`,
        formData,
        {
          headers: {
            // 注意：使用 multipart/form-data 时，不要手动设置 Content-Type
            // 让 axios 自动设置带有 boundary 的 Content-Type
          },
          timeout: 30000,
        }
      );

      console.log('📡 素材上传API响应:', JSON.stringify(uploadResponse.data, null, 2));

      if (uploadResponse.data.media_id) {
        console.log('✅ 永久图片素材上传成功');
        console.log('🆔 素材Media ID:', uploadResponse.data.media_id);

        // 3. 使用上传的素材创建草稿
        console.log('\n📝 使用上传素材创建草稿...');
        
        const draftData = {
          articles: [
            {
              title: "完整工作流测试草稿",
              author: "测试作者",
              digest: "这是一个使用上传素材创建的草稿",
              content: "<p>这是一篇使用上传素材创建的草稿内容。</p>",
              content_source_url: "",
              thumb_media_id: uploadResponse.data.media_id,
              show_cover_pic: 1,
              need_open_comment: 0,
              only_fans_can_comment: 0
            }
          ]
        };

        const draftResponse = await axios.post(
          `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`,
          draftData,
          {
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
            },
            timeout: 30000,
          }
        );

        console.log('📡 草稿API响应:', JSON.stringify(draftResponse.data, null, 2));

        if (draftResponse.data.errcode === 0 && draftResponse.data.media_id) {
          console.log('✅ 草稿创建成功!');
          console.log('🆔 草稿ID:', draftResponse.data.media_id);
        } else if (draftResponse.data.media_id) {
          // 即使没有errcode，只要有media_id也认为是成功
          console.log('✅ 草稿创建成功!');
          console.log('🆔 草稿ID:', draftResponse.data.media_id);
        } else {
          console.log(`❌ 草稿创建失败: ${draftResponse.data.errcode} - ${draftResponse.data.errmsg}`);
        }
      } else {
        console.log(`❌ 素材上传失败: ${uploadResponse.data.errcode} - ${uploadResponse.data.errmsg}`);
      }
    } catch (error) {
      console.error('❌ 素材上传请求失败:', error.response?.data || error.message);
    }

    console.log('\n🎉 完整工作流测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
fullWorkflowTest();