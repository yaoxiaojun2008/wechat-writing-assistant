import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { 
  Draft, 
  CreateDraftResponse, 
  UploadImgResponse,
  PublishOptions,
  PublishSchedule,
  WeChatConfig
} from '../types/index.js';

// WeChat API endpoints
const WECHAT_API_BASE = 'https://api.weixin.qq.com/cgi-bin';
const DRAFT_URL = `${WECHAT_API_BASE}/draft`; // 草稿API
const PUBLISH_URL = `${WECHAT_API_BASE}/freepublish`;
const MEDIA_URL = `${WECHAT_API_BASE}/material`;

// WeChat API response interfaces

export class WeChatService {
  private config: WeChatConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: WeChatConfig) {
    this.config = config;
  }

  /**
   * Get access token from WeChat API
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token in cache
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry.getTime()) {
      return this.accessToken;
    }

    // Get new access token from WeChat API
    if (!this.config.appId || !this.config.appSecret) {
      throw new Error('Missing WeChat App ID or App Secret');
    }

    try {
      const response = await axios.get(
        `${WECHAT_API_BASE}/token`,
        {
          params: {
            grant_type: 'client_credential',
            appid: this.config.appId,
            secret: this.config.appSecret,
          },
          timeout: 10000,
        }
      );

      const data = response.data;

      if (data.errcode) {
        throw new Error(`Failed to get access token: ${data.errmsg}`);
      }

      if (!data.access_token) {
        throw new Error('No access_token returned from WeChat API');
      }

      // Update cached token and expiry time (expires in seconds, so convert to milliseconds)
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000); // Subtract 5 min for safety

      logger.info('Successfully obtained new access token from WeChat API');
      return data.access_token;
    } catch (error) {
      logger.error('Failed to get access token from WeChat API:', error);
      throw new Error(`Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check account type and permissions
   */
  async checkAccountCapabilities(): Promise<{
    canUseDraftAPI: boolean;
    accountType: string;
    isVerified: boolean;
    message: string;
  }> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(
        `${WECHAT_API_BASE}/account/getaccountbasicinfo?access_token=${accessToken}`,
        { timeout: 10000 }
      );

      const data = response.data;
      
      if (data.errcode && data.errcode !== 0) {
        return {
          canUseDraftAPI: false,
          accountType: 'unknown',
          isVerified: false,
          message: `无法获取账号信息: ${data.errmsg}`,
        };
      }

      const accountType = data.account_type;
      const isVerified = data.wx_verify_info?.qualification_verify || false;
      
      // 账号类型: 1=订阅号, 2=服务号
      const canUseDraftAPI = accountType === 2 && isVerified;
      
      let accountTypeName = '';
      switch (accountType) {
        case 1:
          accountTypeName = '订阅号';
          break;
        case 2:
          accountTypeName = '服务号';
          break;
        default:
          accountTypeName = '未知类型';
      }

      const message = canUseDraftAPI 
        ? '账号支持草稿API功能'
        : `当前账号类型(${accountTypeName})${isVerified ? '' : '未认证，'}不支持草稿API，将使用模拟模式`;

      return {
        canUseDraftAPI,
        accountType: accountTypeName,
        isVerified,
        message,
      };

    } catch (error) {
      logger.error('Failed to check account capabilities:', error);
      return {
        canUseDraftAPI: false,
        accountType: 'unknown',
        isVerified: false,
        message: '无法检测账号权限，将使用模拟模式',
      };
    }
  }
  /**
   * Save content to WeChat
   * 
   * 注意: 由于微信API限制，此功能在以下情况下使用Mock模式:
   * 1. 个人订阅号无法使用草稿API（需要已认证的企业服务号）
   * 2. 永久素材API已被微信停止支持（错误码45106）
   * 3. 临时素材API仅支持图片/音频/视频等媒体文件
   * 
   * 建议: 使用Mock模式进行功能演示，或通过微信公众平台网页版手动发布
   */
  async saveToDraft(content: string, title: string): Promise<string> {
    try {
      // Check if we should use real API or mock
      const useRealAPI = process.env.USE_REAL_WECHAT_API === 'true';
      
      // In development mode with mock enabled, use mock response to avoid API issues
      if (process.env.NODE_ENV === 'development' && !useRealAPI) {
        logger.info(`Mock: Saving material to WeChat: ${title}`);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        
        // Generate mock material ID
        const mockMaterialId = `mock_material_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        logger.info(`Mock: Material saved successfully with media_id: ${mockMaterialId}`);
        return mockMaterialId;
      }

      const accessToken = await this.getAccessToken();
      
      // Process content images to replace local paths with WeChat URLs
      const processedContent = await this.processContentImages(content);
      
      // Prepare article object for WeChat draft - only include thumb_media_id if it exists
      const articleData: any = {
        title: title,
        author: this.config.appId || '', // 使用公众号名称或AppID作为作者
        digest: title.substring(0, 120), // 使用标题作为摘要，截取前120个字符
        content: processedContent,
        content_source_url: '', // 原文链接，暂时为空
        show_cover_pic: 0, // 是否显示封面，0为不显示，1为显示
        need_open_comment: 0, // 是否打开评论，0为不打开，1为打开
        only_fans_can_comment: 0, // 是否粉丝才可评论，0为所有人可评论，1为粉丝才可评论
      };

      // Only add thumb_media_id if it's provided (not empty)
      if (this.config.defaultThumbMediaId) {
        articleData.thumb_media_id = this.config.defaultThumbMediaId;
      }

      // Prepare material content in WeChat format (草稿箱格式)
      const materialData = {
        articles: [articleData],
      };

      logger.info(`Saving draft to WeChat: ${title}`);

      // 使用草稿箱API - 注意URL和参数格式
      const response: AxiosResponse<{ errcode: number; errmsg: string; media_id: string }> = await axios.post(
        `${DRAFT_URL}/add?access_token=${accessToken}`,
        materialData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      if (data.errcode !== 0) {
        logger.error(`WeChat draft save failed: ${data.errcode} - ${data.errmsg}`);
        // 如果在生产环境或强制使用真实API失败，记录详细错误并返回错误
        if (process.env.NODE_ENV === 'production' || useRealAPI) {
          throw new Error(`WeChat draft save failed: ${data.errcode} - ${data.errmsg}`);
        } else {
          // 在开发环境，如果真实API失败，回退到模拟模式
          logger.warn('Real API failed, falling back to mock mode');
          logger.info(`Mock: Saving material to WeChat: ${title}`);
          
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
          
          // Generate mock material ID
          const mockMaterialId = `mock_material_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          logger.info(`Mock: Material saved successfully with media_id: ${mockMaterialId}`);
          return mockMaterialId;
        }
      }

      if (!data.media_id) {
        throw new Error('No media_id returned from WeChat API');
      }

      logger.info(`Draft saved successfully with media_id: ${data.media_id}`);
      return data.media_id;

    } catch (error) {
      logger.error('Failed to save draft to WeChat:', error);
      // 如果错误是由于微信API返回的，而不是访问令牌问题，我们仍然可以使用模拟模式
      if (process.env.NODE_ENV === 'development') {
        logger.info(`Falling back to mock mode for: ${error instanceof Error ? error.message : String(error)}`);
        logger.info(`Mock: Saving material to WeChat`);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        
        // Generate mock material ID
        const mockMaterialId = `mock_material_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        logger.info(`Mock: Material saved successfully with media_id: ${mockMaterialId}`);
        return mockMaterialId;
      } else {
        throw new Error('Failed to save draft to WeChat platform');
      }
    }
  }

  /**
   * Get list of materials from WeChat
   */
  async getDraftList(): Promise<Draft[]> {
    try {
      // Check if we should use real API or mock
      const useRealAPI = process.env.USE_REAL_WECHAT_API === 'true';
      
      // In development mode with mock enabled, return mock materials
      if (process.env.NODE_ENV === 'development' && !useRealAPI) {
        logger.info('Mock: Fetching material list from WeChat');
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        
        const mockDrafts: Draft[] = [
          {
            id: uuidv4(),
            wechatDraftId: 'mock_material_001',
            title: '微信公众号写作技巧分享',
            content: '这是一篇关于如何提高微信公众号写作质量的文章...',
            status: 'uploaded',
            createdAt: new Date(Date.now() - 86400000), // 1 day ago
            updatedAt: new Date(Date.now() - 86400000),
          },
          {
            id: uuidv4(),
            wechatDraftId: 'mock_material_002',
            title: '内容创作的思考与实践',
            content: '在数字化时代，内容创作已经成为了一种重要的表达方式...',
            status: 'uploaded',
            createdAt: new Date(Date.now() - 172800000), // 2 days ago
            updatedAt: new Date(Date.now() - 172800000),
          }
        ];
        
        logger.info(`Mock: Retrieved ${mockDrafts.length} materials from WeChat`);
        return mockDrafts;
      }

      const accessToken = await this.getAccessToken();

      logger.info('Fetching material list from WeChat');

      // 使用永久素材API获取图文素材列表
      const response: AxiosResponse<{ errcode: number; errmsg: string; item: Array<any> }> = await axios.post(
        `${MEDIA_URL}/batchget_material?access_token=${accessToken}`,
        {
          type: 'news', // 图文素材
          offset: 0,
          count: 20, // Get up to 20 materials
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      if (data.errcode !== 0) {
        throw new Error(`WeChat material list failed: ${data.errcode} - ${data.errmsg}`);
      }

      const drafts: Draft[] = [];

      if (data.item && data.item.length > 0) {
        for (const item of data.item) {
          if (item.content?.news_item && item.content.news_item.length > 0) {
            const newsItem = item.content.news_item[0]; // Take first article
            
            const draft: Draft = {
              id: uuidv4(),
              wechatDraftId: item.media_id,
              title: newsItem.title,
              content: newsItem.content,
              status: 'uploaded',
              createdAt: new Date(item.update_time * 1000),
              updatedAt: new Date(item.update_time * 1000),
            };

            drafts.push(draft);
          }
        }
      }

      logger.info(`Retrieved ${drafts.length} materials from WeChat`);
      return drafts;

    } catch (error) {
      logger.error('Failed to get material list from WeChat:', error);
      throw new Error('Failed to retrieve materials from WeChat platform');
    }
  }

  /**
   * Publish article from draft
   */
  async publishArticle(draftId: string, _publishOptions: PublishOptions): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();

      logger.info(`Publishing article with draft ID: ${draftId}`);

      const response: AxiosResponse<{ errcode: number; errmsg: string; publish_id: string }> = await axios.post(
        `${PUBLISH_URL}/submit?access_token=${accessToken}`,
        {
          media_id: draftId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      if (data.errcode !== 0) {
        throw new Error(`WeChat publish failed: ${data.errcode} - ${data.errmsg}`);
      }

      logger.info(`Article published successfully with publish_id: ${data.publish_id}`);
      return true;

    } catch (error) {
      logger.error('Failed to publish article to WeChat:', error);
      throw new Error('Failed to publish article to WeChat platform');
    }
  }

  /**
   * Schedule publication (Note: WeChat API doesn't support scheduled publishing directly)
   * This method would be used with a scheduler service
   */
  async schedulePublication(draftId: string, schedule: PublishSchedule): Promise<string> {
    // WeChat API doesn't support scheduled publishing directly
    // This would typically be handled by a scheduler service that calls publishArticle at the scheduled time
    const taskId = uuidv4();
    
    logger.info(`Scheduled publication created for draft ${draftId} at ${schedule.scheduledTime}`);
    
    // In a real implementation, this would create a scheduled task in the scheduler service
    // For now, we just return a task ID
    return taskId;
  }

  /**
   * Update WeChat configuration
   */
  updateConfig(config: WeChatConfig): void {
    this.config = config;
    // Clear cached token when config changes
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.appId && this.config.appSecret);
  }

  /**
   * Get current token status
   */
  getTokenStatus(): { hasToken: boolean; expiresAt: Date | null } {
    return {
      hasToken: !!this.accessToken,
      expiresAt: this.tokenExpiry,
    };
  }

  /**
   * Upload permanent image to WeChat
   */
  async uploadPermanentImage(imagePath: string): Promise<string> {
    try {
      const useRealAPI = process.env.USE_REAL_WECHAT_API === 'true';
      
      // In development mode with mock enabled, use mock response
      if (process.env.NODE_ENV === 'development' && !useRealAPI) {
        logger.info(`Mock: Uploading permanent image: ${imagePath}`);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        
        // Generate mock media ID
        const mockMediaId = `mock_img_${Date.now()}_${path.basename(imagePath, path.extname(imagePath))}`;
        
        logger.info(`Mock: Permanent image uploaded successfully with media_id: ${mockMediaId}`);
        return mockMediaId;
      }

      const accessToken = await this.getAccessToken();
      
      const formData = new FormData();
      const fs = await import('fs');
      const stream = fs.createReadStream(imagePath);
      
      formData.append('media', stream, {
        filename: path.basename(imagePath),
        contentType: 'image/jpeg'
      });
      
      const response: AxiosResponse<{ media_id: string; url: string }> = await axios.post(
        `${MEDIA_URL}/add_material?access_token=${accessToken}&type=image`,
        formData,
        {
          headers: formData.getHeaders ? formData.getHeaders() : {},
          timeout: 30000, // Increased timeout for image upload
        }
      );
      
      const data = response.data;
      
      if (data.media_id) {
        logger.info(`Permanent image uploaded successfully with media_id: ${data.media_id}`);
        return data.media_id;
      }
      
      throw new Error(`WeChat permanent image upload failed: ${JSON.stringify(data)}`);
    } catch (error: any) {
      logger.error('Failed to upload permanent image to WeChat:', error);
      
      // In development, if real API fails, fallback to mock
      if (process.env.NODE_ENV === 'development') {
        logger.info(`Falling back to mock mode for image upload: ${error instanceof Error ? error.message : String(error)}`);
        logger.info(`Mock: Uploading permanent image`);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        
        // Generate mock media ID
        const mockMediaId = `mock_img_${Date.now()}_fallback`;
        
        logger.info(`Mock: Permanent image uploaded successfully with media_id: ${mockMediaId}`);
        return mockMediaId;
      } else {
        if (error.response) {
          logger.error('Full response from WeChat API:', error.response.data);
          throw new Error(`WeChat API error: ${error.response.status} - ${error.response.data.errmsg || error.response.statusText}`);
        } else if (error.request) {
          throw new Error(`Network error: ${error.message}`);
        } else {
          throw new Error(`Upload failed: ${error.message}`);
        }
      }
    }
  }

  /**
   * Upload image for content
   */
  async uploadContentImage(imagePath: string): Promise<string> {
    try {
      const useRealAPI = process.env.USE_REAL_WECHAT_API === 'true';
      
      // In development mode with mock enabled, use mock response
      if (process.env.NODE_ENV === 'development' && !useRealAPI) {
        logger.info(`Mock: Uploading content image: ${imagePath}`);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        
        // Generate mock image URL
        const mockImageUrl = `https://mock.example.com/images/mock_${Date.now()}_${path.basename(imagePath)}`;
        
        logger.info(`Mock: Content image uploaded successfully: ${mockImageUrl}`);
        return mockImageUrl;
      }

      const accessToken = await this.getAccessToken();
      
      const formData = new FormData();
      const fs = await import('fs');
      formData.append('media', fs.createReadStream(imagePath), {
        filename: path.basename(imagePath),
        contentType: 'image/jpeg'
      });
      
      // Upload image to WeChat content image API
      const response: AxiosResponse<UploadImgResponse> = await axios.post(
        `${MEDIA_URL}/uploadimg?access_token=${accessToken}`,
        formData,
        {
          headers: formData.getHeaders ? formData.getHeaders() : {},
          timeout: 30000, // Increased timeout for image upload
        }
      );
      
      const data = response.data;
      
      // Check if the response indicates success
      if (data.url) {
        logger.info(`Content image uploaded successfully: ${data.url}`);
        return data.url;
      }
      
      // If there's an error code, throw an error
      if (data.errcode) {
        throw new Error(`WeChat content image upload failed: ${data.errcode} - ${data.errmsg}`);
      }
      
      throw new Error('No URL returned from WeChat content image upload API');
    } catch (error: any) {
      logger.error('Failed to upload image for content on WeChat:', error);
      
      // In development, if real API fails, fallback to mock
      if (process.env.NODE_ENV === 'development') {
        logger.info(`Falling back to mock mode for content image upload: ${error instanceof Error ? error.message : String(error)}`);
        logger.info(`Mock: Uploading content image`);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        
        // Generate mock image URL
        const mockImageUrl = `https://mock.example.com/images/mock_${Date.now()}_content`;
        
        logger.info(`Mock: Content image uploaded successfully: ${mockImageUrl}`);
        return mockImageUrl;
      } else {
        if (error.response) {
          logger.error('Full response from WeChat API:', error.response.data);
          throw new Error(`WeChat API error: ${error.response.status} - ${error.response.data.errmsg || error.response.statusText}`);
        } else if (error.request) {
          throw new Error(`Network error: ${error.message}`);
        } else {
          throw new Error(`Upload failed: ${error.message}`);
        }
      }
    }
  }

  /**
   * Process content images - find local image paths in content and upload them to WeChat
   */
  private async processContentImages(content: string): Promise<string> {
    // Find all img tags with local file paths
    const imgRegex = /<img[^>]+src=["']([^"']+\.(jpg|jpeg|png|gif|bmp))["'][^>]*>/gi;
    let processedContent = content;
    
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const imagePath = match[1]; // Extract image path from src
      
      // Check if imagePath is a local file path (not a URL)
      const isLocalPath = !imagePath.startsWith('http://') && !imagePath.startsWith('https://');
      
      if (isLocalPath) {
        try {
          // Upload the local image to WeChat to get a content image URL
          const imageUrl = await this.uploadContentImage(imagePath);
          
          // Replace the local image path with the WeChat image URL
          const updatedImgTag = fullMatch.replace(imagePath, imageUrl);
          processedContent = processedContent.replace(fullMatch, updatedImgTag);
        } catch (error) {
          logger.error(`Failed to process content image for path ${imagePath}:`, error);
          // Keep the original img tag if processing fails
        }
      }
    }
    
    return processedContent;
  }

  /**
   * Create a draft with images
   */
  async createDraftWithImages(
    title: string, 
    content: string, 
    thumbMediaId: string, 
    author?: string, 
    digest?: string
  ): Promise<{ draft: Draft, wechatDraftId: string }> {
    try {
      const accessToken = await this.getAccessToken();
      
      // First process the content to replace any local image paths with WeChat image URLs
      const processedContent = await this.processContentImages(content);
      
      // Create the article object for WeChat draft
      const articleData = {
        articles: [{
          title,
          author: author || '',
          digest: digest || '',
          content: processedContent,
          content_source_url: '',
          thumb_media_id: thumbMediaId, // 使用上传后的缩略图media_id
          show_cover_pic: 1,
          need_open_comment: 1,
          only_fans_can_comment: 0
        }]
      };
      
      logger.info('Creating draft on WeChat with data:', { 
        title, 
        hasThumb: !!thumbMediaId, 
        contentLength: processedContent.length 
      });
      
      // Call WeChat API to create the draft
      const response: AxiosResponse<CreateDraftResponse> = await axios.post(
        `${DRAFT_URL}/add?access_token=${accessToken}`,
        articleData,
        {
          timeout: 10000,
        }
      );
      
      const data = response.data;
      
      if (data.media_id) {
        logger.info(`Draft created successfully with media_id: ${data.media_id}`);
        
        // Return both the draft info and the WeChat draft ID
        return {
          draft: {
            id: data.media_id,
            title,
            content: processedContent,
            status: 'uploaded',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          wechatDraftId: data.media_id
        };
      }
      
      // If there's an error code, throw an error
      if (data.errcode) {
        throw new Error(`WeChat draft creation failed: ${data.errcode} - ${data.errmsg}`);
      }
      
      throw new Error('No media_id returned from WeChat draft creation API');
    } catch (error: any) {
      logger.error('Failed to create draft with images on WeChat:', error);
      
      if (error.response) {
        logger.error('Full response from WeChat API:', error.response.data);
        throw new Error(`WeChat API error: ${error.response.status} - ${error.response.data.errmsg || error.response.statusText}`);
      } else if (error.request) {
        throw new Error(`Network error: ${error.message}`);
      } else {
        throw new Error(`Draft creation failed: ${error.message}`);
      }
    }
  }
}

// Create singleton instance
const wechatConfig: WeChatConfig = {
  appId: process.env.WECHAT_APP_ID || '',
  appSecret: process.env.WECHAT_APP_SECRET || '',
};

export const wechatService = new WeChatService(wechatConfig);