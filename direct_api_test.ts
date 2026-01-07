import * as dotenv from 'dotenv';
import axios from 'axios';

// 加载环境变量
dotenv.config({ path: './.env' });

async function directAPITest() {
  console.log('🚀 开始直接调用微信API测试...');

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

    // 2. 测试创建草稿
    console.log('\n📝 测试创建草稿...');
    
    const draftData = {
      articles: [
        {
          title: "直接API测试草稿",
          author: "测试作者",
          digest: "这是一个通过直接API调用创建的草稿",
          content: "<p>这是一篇通过直接API调用创建的草稿内容。</p>",
          content_source_url: "",
          thumb_media_id: "",  // 空值，因为个人号可能不需要封面
          show_cover_pic: 0,
          need_open_comment: 0,
          only_fans_can_comment: 0
        }
      ]
    };

    try {
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

      if (draftResponse.data.errcode === 0 || draftResponse.data.media_id) {
        console.log('✅ 草稿创建成功!');
        console.log('🆔 草稿ID:', draftResponse.data.media_id);
      } else {
        console.log(`❌ 草稿创建失败: ${draftResponse.data.errcode} - ${draftResponse.data.errmsg}`);
      }
    } catch (error) {
      console.error('❌ 草稿创建请求失败:', error.response?.data || error.message);
    }

    // 3. 测试获取草稿列表
    console.log('\n📋 测试获取草稿列表...');
    try {
      const listResponse = await axios.get(
        `https://api.weixin.qq.com/cgi-bin/draft/list?access_token=${accessToken}&offset=0&count=20`,
        {
          timeout: 30000,
        }
      );

      console.log('📡 草稿列表API响应:', JSON.stringify(listResponse.data, null, 2));

      if (listResponse.data.errcode === 0) {
        console.log('✅ 草稿列表获取成功!');
        console.log('📊 草稿数量:', listResponse.data.item_count || 0);
      } else {
        console.log(`❌ 草稿列表获取失败: ${listResponse.data.errcode} - ${listResponse.data.errmsg}`);
      }
    } catch (error) {
      console.error('❌ 草稿列表请求失败:', error.response?.data || error.message);
    }

    console.log('\n🎉 直接API测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
directAPITest();