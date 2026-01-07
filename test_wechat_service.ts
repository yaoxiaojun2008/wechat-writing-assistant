import axios from 'axios';

// 测试环境配置
const BASE_URL = 'http://localhost:3001';

// 添加认证token（需要先获取或使用测试token）
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0X3VzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'; // 默认测试token

interface Draft {
  id: string;
  wechatDraftId: string;
  title: string;
  content: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

async function testWeChatService() {
  console.log('🚀 开始测试WeChat服务...');

  try {
    // 1. 测试获取账号能力
    console.log('\n🔍 测试获取账号能力...');
    const capabilitiesResponse = await axios.get(`${BASE_URL}/api/wechat/capabilities`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    console.log('✅ 账号能力测试成功:', capabilitiesResponse.data);

    // 2. 测试保存草稿
    console.log('\n📝 测试保存草稿...');
    const draftContent = '<p>这是一篇测试草稿内容。</p><p>包含图片测试:</p><img src="http://example.com/test.jpg" alt="测试图片"><p>内容结束。</p>';
    const draftTitle = '测试草稿标题';
    
    const saveDraftResponse = await axios.post(`${BASE_URL}/api/wechat/drafts`, {
      content: draftContent,
      title: draftTitle
    }, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    console.log('✅ 草稿保存测试成功:', saveDraftResponse.data);

    // 3. 测试获取草稿列表
    console.log('\n📋 测试获取草稿列表...');
    const draftsResponse = await axios.get(`${BASE_URL}/api/wechat/drafts`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    console.log('✅ 草稿列表获取成功，返回草稿数量:', draftsResponse.data.length);

    if (draftsResponse.data.length > 0) {
      console.log('📄 第一个草稿信息:', {
        id: draftsResponse.data[0].id,
        title: draftsResponse.data[0].title,
        createdAt: draftsResponse.data[0].createdAt
      });
    }

    console.log('\n🎉 WeChat服务测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.response?.data || error.message);
  }
}

// 运行测试
testWeChatService();