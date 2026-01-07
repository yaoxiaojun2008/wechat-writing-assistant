import axios, { AxiosResponse } from 'axios';
import { Draft, PublishOptions, PublishSchedule } from '../types/index';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// API response interface
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// Progress callback type for upload progress
export type ProgressCallback = (progress: number) => void;

export class WeChatService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/wechat`;
  }

  /**
   * Get authorization headers with session token
   */
  private getAuthHeaders() {
    const sessionId = localStorage.getItem('sessionId');
    return {
      'Content-Type': 'application/json',
      'Authorization': sessionId ? `Bearer ${sessionId}` : '',
    };
  }

  /**
   * Save content as draft to WeChat
   */
  async saveToDraft(
    title: string, 
    content: string, 
    onProgress?: ProgressCallback
  ): Promise<{ draft: Draft; wechatDraftId: string }> {
    try {
      if (onProgress) onProgress(0);

      const response: AxiosResponse<ApiResponse<{ draft: Draft; wechatDraftId: string }>> = 
        await axios.post(
          `${this.baseURL}/drafts`,
          { title, content },
          {
            headers: this.getAuthHeaders(),
            timeout: 30000,
            onUploadProgress: (progressEvent) => {
              if (onProgress && progressEvent.total) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(progress);
              }
            },
          }
        );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to save draft');
      }

      if (onProgress) onProgress(100);
      return response.data.data;

    } catch (error) {
      if (onProgress) onProgress(0);
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Failed to save draft: ${message}`);
      }
      
      throw new Error('Network error while saving draft');
    }
  }

  /**
   * Get list of drafts from WeChat
   */
  async getDraftList(): Promise<{ drafts: Draft[]; count: number }> {
    try {
      const response: AxiosResponse<ApiResponse<{ drafts: Draft[]; count: number }>> = 
        await axios.get(`${this.baseURL}/drafts`, {
          headers: this.getAuthHeaders(),
          timeout: 30000,
        });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch drafts');
      }

      return response.data.data;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Failed to fetch drafts: ${message}`);
      }
      
      throw new Error('Network error while fetching drafts');
    }
  }

  /**
   * Publish a draft article
   */
  async publishArticle(
    draftId: string, 
    publishOptions: PublishOptions
  ): Promise<{ published: boolean; publishedAt: Date }> {
    try {
      const response: AxiosResponse<ApiResponse<{ published: boolean; publishedAt: Date }>> = 
        await axios.post(
          `${this.baseURL}/drafts/${draftId}/publish`,
          { publishOptions },
          {
            headers: this.getAuthHeaders(),
            timeout: 30000,
          }
        );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to publish article');
      }

      return {
        ...response.data.data,
        publishedAt: new Date(response.data.data.publishedAt),
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Failed to publish article: ${message}`);
      }
      
      throw new Error('Network error while publishing article');
    }
  }

  /**
   * Schedule publication of a draft
   */
  async schedulePublication(
    draftId: string,
    scheduledTime: Date,
    publishOptions: PublishOptions
  ): Promise<{ taskId: string; schedule: PublishSchedule }> {
    try {
      const response: AxiosResponse<ApiResponse<{ taskId: string; schedule: PublishSchedule }>> = 
        await axios.post(
          `${this.baseURL}/drafts/${draftId}/schedule`,
          {
            scheduledTime: scheduledTime.toISOString(),
            publishOptions,
          },
          {
            headers: this.getAuthHeaders(),
            timeout: 30000,
          }
        );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to schedule publication');
      }

      return {
        ...response.data.data,
        schedule: {
          ...response.data.data.schedule,
          scheduledTime: new Date(response.data.data.schedule.scheduledTime),
          createdAt: new Date(response.data.data.schedule.createdAt),
        },
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Failed to schedule publication: ${message}`);
      }
      
      throw new Error('Network error while scheduling publication');
    }
  }

  /**
   * Get WeChat service status
   */
  async getServiceStatus(): Promise<{
    configured: boolean;
    tokenStatus: { hasToken: boolean; expiresAt: Date | null };
  }> {
    try {
      const response: AxiosResponse<ApiResponse<{
        configured: boolean;
        tokenStatus: { hasToken: boolean; expiresAt: Date | null };
      }>> = await axios.get(`${this.baseURL}/status`, {
        headers: this.getAuthHeaders(),
        timeout: 10000,
      });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to get service status');
      }

      return {
        ...response.data.data,
        tokenStatus: {
          ...response.data.data.tokenStatus,
          expiresAt: response.data.data.tokenStatus.expiresAt 
            ? new Date(response.data.data.tokenStatus.expiresAt)
            : null,
        },
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Failed to get service status: ${message}`);
      }
      
      throw new Error('Network error while checking service status');
    }
  }

  /**
   * Check if WeChat service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      const status = await this.getServiceStatus();
      return status.configured;
    } catch (error) {
      console.error('WeChat service availability check failed:', error);
      return false;
    }
  }

  /**
   * Upload image to permanent media library
   */
  async uploadPermanentImage(imagePath: string): Promise<string> {
    try {
      const response: AxiosResponse<ApiResponse<{ mediaId: string }>> = 
        await axios.post(
          `${this.baseURL}/images/permanent`,
          { imagePath },
          {
            headers: this.getAuthHeaders(),
            timeout: 30000,
          }
        );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to upload permanent image');
      }

      return response.data.data.mediaId;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Failed to upload permanent image: ${message}`);
      }
      
      throw new Error('Network error while uploading permanent image');
    }
  }

  /**
   * Upload image for use in content
   */
  async uploadContentImage(imagePath: string): Promise<string> {
    try {
      const response: AxiosResponse<ApiResponse<{ imageUrl: string }>> = 
        await axios.post(
          `${this.baseURL}/images/content`,
          { imagePath },
          {
            headers: this.getAuthHeaders(),
            timeout: 30000,
          }
        );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to upload content image');
      }

      return response.data.data.imageUrl;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Failed to upload content image: ${message}`);
      }
      
      throw new Error('Network error while uploading content image');
    }
  }

  /**
   * Create draft with images
   */
  async createDraftWithImages(
    title: string, 
    content: string, 
    thumbMediaId: string, 
    author?: string, 
    digest?: string
  ): Promise<{ draft: Draft; wechatDraftId: string }> {
    try {
      const response: AxiosResponse<ApiResponse<{ draft: Draft; wechatDraftId: string }>> = 
        await axios.post(
          `${this.baseURL}/drafts-with-images`,
          { title, content, thumbMediaId, author, digest },
          {
            headers: this.getAuthHeaders(),
            timeout: 30000,
          }
        );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to create draft with images');
      }

      return response.data.data;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Failed to create draft with images: ${message}`);
      }
      
      throw new Error('Network error while creating draft with images');
    }
  }
}

// Create singleton instance
export const wechatService = new WeChatService();