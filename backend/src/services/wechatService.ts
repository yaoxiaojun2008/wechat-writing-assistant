import axios, { AxiosResponse } from 'axios';
import { logger } from '../utils/logger.js';
import { Draft, PublishOptions, PublishSchedule, WeChatConfig } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

// WeChat API endpoints
const WECHAT_API_BASE = 'https://api.weixin.qq.com/cgi-bin';
const TOKEN_URL = `${WECHAT_API_BASE}/token`;
const DRAFT_URL = `${WECHAT_API_BASE}/draft`; // 草稿API
const PUBLISH_URL = `${WECHAT_API_BASE}/freepublish`;

// WeChat API response interfaces
interface WeChatTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface WeChatDraftResponse {
  errcode: number;
  errmsg: string;
  media_id?: string;
}

interface WeChatMaterialListResponse {
  errcode: number;
  errmsg: string;
  total_count?: number;
  item_count?: number;
  item?: Array<{
    media_id: string;
    name: string;
    update_time: number;
    url: string;
    content?: {
      news_item: Array<{
        title: string;
        author: string;
        digest: string;
        content: string;
        content_source_url: string;
        thumb_media_id: string;
        show_cover_pic: number;
        url: string;
        thumb_url: string;
        need_open_comment: number;
        only_fans_can_comment: number;
      }>;
    };
  }>;
}

interface WeChatPublishResponse {
  errcode: number;
  errmsg: string;
  publish_id?: string;
}

export class WeChatService {
  private config: WeChatConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config: WeChatConfig) {
    this.config = config;
  }

  /**
   * Get access token from WeChat API
   */
  private async getAccessToken(): Promise<string> {
    try {
      // Check if current token is still valid
      if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
        return this.accessToken;
      }

      logger.info('Fetching new WeChat access token');
      
      const response: AxiosResponse<WeChatTokenResponse> = await axios.get(TOKEN_URL, {
        params: {
          grant_type: 'client_credential',
          appid: this.config.appId,
          secret: this.config.appSecret,
        },
        timeout: 10000,
      });

      const data = response.data;

      if (data.errcode) {
        throw new Error(`WeChat API error: ${data.errcode} - ${data.errmsg}`);
      }

      if (!data.access_token || !data.expires_in) {
        throw new Error('Invalid token response from WeChat API');
      }

      this.accessToken = data.access_token;
      // Set expiration time with 5 minute buffer
      this.tokenExpiresAt = new Date(Date.now() + (data.expires_in - 300) * 1000);

      logger.info('WeChat access token obtained successfully');
      return this.accessToken;

    } catch (error) {
      logger.error('Failed to get WeChat access token:', error);
      throw new Error('Failed to authenticate with WeChat API');
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
        `https://api.weixin.qq.com/cgi-bin/account/getaccountbasicinfo?access_token=${accessToken}`,
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
      
      // Prepare material content in WeChat format (永久素材)
      const materialData = {
        articles: [{
          title: title,
          author: '',
          digest: title.substring(0, 120), // Use title as digest, truncated
          content: content,
          content_source_url: '',
          // Note: thumb_media_id is optional for permanent materials
          show_cover_pic: 0, // Don't show cover pic
          need_open_comment: 0,
          only_fans_can_comment: 0,
        }],
      };

      logger.info(`Saving draft to WeChat: ${title}`);

      // 使用草稿API而不是永久素材API
      const response: AxiosResponse<WeChatDraftResponse> = await axios.post(
        `${DRAFT_URL}/add?access_token=${accessToken}`,
        materialData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      if (data.errcode !== 0) {
        throw new Error(`WeChat draft save failed: ${data.errcode} - ${data.errmsg}`);
      }

      if (!data.media_id) {
        throw new Error('No media_id returned from WeChat API');
      }

      logger.info(`Draft saved successfully with media_id: ${data.media_id}`);
      return data.media_id;

    } catch (error) {
      logger.error('Failed to save draft to WeChat:', error);
      throw new Error('Failed to save draft to WeChat platform');
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
      const response: AxiosResponse<WeChatMaterialListResponse> = await axios.post(
        `${MATERIAL_URL}/batchget_material?access_token=${accessToken}`,
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

      const response: AxiosResponse<WeChatPublishResponse> = await axios.post(
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
    this.tokenExpiresAt = null;
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
      expiresAt: this.tokenExpiresAt,
    };
  }
}

// Create singleton instance
const wechatConfig: WeChatConfig = {
  appId: process.env.WECHAT_APP_ID || '',
  appSecret: process.env.WECHAT_APP_SECRET || '',
};

export const wechatService = new WeChatService(wechatConfig);