import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import { wechatService } from './backend/src/services/wechatService.js';

// Load environment variables
dotenv.config({ path: './.env' });

interface WeChatTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface WeChatMaterialResponse {
  media_id?: string;
  url?: string;
  errcode?: number;
  errmsg?: string;
}

interface WeChatDraftResponse {
  errcode: number;
  errmsg: string;
  media_id?: string;
}

class ImageUploadWorkflow {
  private appId: string;
  private appSecret: string;
  private accessToken: string | null = null;

  constructor() {
    this.appId = process.env.WECHAT_APP_ID || '';
    this.appSecret = process.env.WECHAT_APP_SECRET || '';

    if (!this.appId || !this.appSecret) {
      throw new Error('缺少微信配置信息');
    }

    console.log(`✅ 使用配置: AppID: ${this.appId}`);
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    console.log("🔑 正在获取微信访问令牌...");

    try {
      const response: AxiosResponse<WeChatTokenResponse> = await axios.get(
        `https://api.weixin.qq.com/cgi-bin/token`,
        {
          params: {
            grant_type: 'client_credential',
            appid: this.appId,
            secret: this.appSecret,
          },
          timeout: 10000,
        }
      );

      const data = response.data;

      if (data.errcode) {
        throw new Error(`获取令牌失败: ${data.errcode} - ${data.errmsg}`);
      }

      if (!data.access_token) {
        throw new Error('响应中没有access_token');
      }

      this.accessToken = data.access_token;
      console.log("✅ 成功获取访问令牌");
      return this.accessToken;
    } catch (error) {
      console.error('❌ 获取令牌失败:', error);
      throw new Error('获取访问令牌失败');
    }
  }

  async uploadPermanentImage(imagePath: string): Promise<string | null> {
    console.log(`🖼️ 正在上传永久图片素材: ${imagePath}`);

    try {
      const accessToken = await this.getAccessToken();
      
      const form = new FormData();
      form.append('media', fs.createReadStream(imagePath));

      const response: AxiosResponse<WeChatMaterialResponse> = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=image`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      if (data.media_id) {
        console.log(`✅ 永久图片素材上传成功，ID: ${data.media_id}`);
        return data.media_id;
      } else {
        console.error(`❌ 永久图片素材上传失败:`, data);
        return null;
      }
    } catch (error) {
      console.error(`❌ 上传永久图片素材失败:`, error);
      return null;
    }
  }

  async uploadContentImage(imagePath: string): Promise<string | null> {
    console.log(`🖼️ 正在上传图文消息图片: ${imagePath}`);

    try {
      const accessToken = await this.getAccessToken();
      
      const form = new FormData();
      form.append('media', fs.createReadStream(imagePath));

      const response: AxiosResponse<WeChatMaterialResponse> = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      if (data.url) {
        console.log(`✅ 图文消息图片上传成功，URL: ${data.url}`);
        return data.url;
      } else {
        console.error(`❌ 图文消息图片上传失败:`, data);
        return null;
      }
    } catch (error) {
      console.error(`❌ 上传图文消息图片失败:`, error);
      return null;
    }
  }

  async createDraftWithImage(
    thumbMediaId: string,
    contentImageUrl: string,
    title: string,
    content: string
  ): Promise<string | null> {
    console.log(`📝 正在创建草稿: ${title}`);

    try {
      const accessToken = await this.getAccessToken();

      const draftData = {
        articles: [{
          title,
          author: '测试作者',
          digest: '这是一段摘要',
          content,
          content_source_url: '',
          thumb_media_id: thumbMediaId,
          show_cover_pic: 1,
          need_open_comment: 0,
          only_fans_can_comment: 0
        }]
      };

      const response: AxiosResponse<WeChatDraftResponse> = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`,
        draftData,
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      if (data.errcode === 0) {
        console.log("✅ 草稿创建成功!");
        console.log(`🆔 草稿Media ID: ${data.media_id}`);
        return data.media_id || null;
      } else {
        console.error(`❌ 草稿创建失败: ${data.errcode} - ${data.errmsg}`);
        return null;
      }
    } catch (error) {
      console.error('❌ 草稿创建失败:', error);
      return null;
    }
  }

  async runWorkflow(): Promise<void> {
    console.log("🚀 开始执行图片上传和草稿创建流程");
    console.log("=".repeat(70));

    // 获取图片目录中的所有图片
    const imgDir = './img';
    if (!fs.existsSync(imgDir)) {
      console.error(`❌ 图片目录不存在: ${imgDir}`);
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

    // 获取访问令牌
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      console.error("💥 无法获取访问令牌，流程终止");
      return;
    }

    // 仅处理前3张图片
    for (let i = 0; i < Math.min(3, imageFiles.length); i++) {
      const imgFile = imageFiles[i];
      const imgPath = path.join(imgDir, imgFile);

      console.log(`\n--- 处理第 ${i + 1} 张图片: ${imgFile} ---`);

      // 上传封面图片素材
      const thumbMediaId = await this.uploadPermanentImage(imgPath);
      if (!thumbMediaId) {
        console.log(`💥 无法上传封面图片 ${imgFile}，跳过此图片`);
        continue;
      }

      // 上传内容图片
      const contentImageUrl = await this.uploadContentImage(imgPath);
      if (!contentImageUrl) {
        console.log(`💥 无法上传内容图片 ${imgFile}，跳过此图片`);
        continue;
      }

      // 创建包含图片的草稿
      const contentWithImg = `<p>这是一篇使用图片 ${imgFile} 创建的测试草稿内容。</p><p>内容中的图片:</p><img src='${contentImageUrl}' alt='内容图片'><p>这是图片之后的内容。</p>`;
      const title = `测试草稿 - ${imgFile}`;

      const result = await this.createDraftWithImage(thumbMediaId, contentImageUrl, title, contentWithImg);

      if (result) {
        console.log(`🎉 草稿创建成功！草稿ID: ${result}`);
      } else {
        console.log("💥 草稿创建失败");
      }

      console.log(`--- ${imgFile} 处理完成 ---`);
    }

    console.log("\n" + "=".repeat(70));
    console.log("📊 图片上传和草稿创建流程执行完成");
    console.log("=".repeat(70));
  }
}

// 运行工作流程
async function runImageUploadWorkflow(): Promise<void> {
  try {
    const workflow = new ImageUploadWorkflow();
    await workflow.runWorkflow();
  } catch (error) {
    console.error('❌ 工作流程执行失败:', error);
  }
}

// 执行
runImageUploadWorkflow();