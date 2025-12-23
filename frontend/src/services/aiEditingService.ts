import axios from 'axios';
import { ApiResponse, EditingOptions, EditingResult, EditingSession, AISuggestion } from '../types/index.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/ai-editing`,
  timeout: 60000, // 60 seconds for AI operations
  withCredentials: true,
});

// Add request interceptor to include session token
apiClient.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('sessionId');
  if (sessionId) {
    config.headers.Authorization = `Bearer ${sessionId}`;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear session and redirect to login
      localStorage.removeItem('sessionId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface AIEditingService {
  editContent(text: string, options?: Partial<EditingOptions>): Promise<EditingResult>;
  preserveWritingStyle(text: string, styleReference?: string): Promise<{ originalText: string; editedText: string; styleReference?: string; timestamp: string }>;
  correctSpellingAndGrammar(text: string): Promise<{ originalText: string; correctedText: string; timestamp: string }>;
  reorganizeParagraphs(text: string): Promise<{ originalText: string; reorganizedText: string; timestamp: string }>;
  generateSuggestions(text: string): Promise<{ text: string; suggestions: AISuggestion[]; timestamp: string }>;
  createEditingSession(text: string): Promise<EditingSession>;
  updateEditingSession(sessionId: string, updates: Partial<EditingSession>): Promise<EditingSession>;
}

class AIEditingServiceImpl implements AIEditingService {
  /**
   * 智能编辑文本内容
   */
  async editContent(text: string, options: Partial<EditingOptions> = {}): Promise<EditingResult> {
    try {
      console.log('🔄 AI editing request:', { text: text.substring(0, 100) + '...', options });
      
      const defaultOptions: EditingOptions = {
        level: 'moderate',
        preserveStyle: true,
        correctGrammar: true,
        reorganizeStructure: false,
      };

      const editingOptions = { ...defaultOptions, ...options };

      const response = await apiClient.post<ApiResponse<EditingResult>>('/edit', {
        text,
        options: editingOptions,
      });

      console.log('📡 AI editing response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'AI编辑失败');
      }

      return response.data.data!;
    } catch (error) {
      console.error('❌ AI editing failed:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('📡 Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          baseURL: error.config?.baseURL
        });
        
        const message = error.response?.data?.error?.message || 'AI编辑服务暂时不可用';
        throw new Error(message);
      }
      
      throw new Error('AI编辑处理失败，请重试');
    }
  }

  /**
   * 保持写作风格的编辑
   */
  async preserveWritingStyle(
    text: string, 
    styleReference?: string
  ): Promise<{ originalText: string; editedText: string; styleReference?: string; timestamp: string }> {
    try {
      const response = await apiClient.post<ApiResponse<any>>('/preserve-style', {
        text,
        styleReference,
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message || '文风保持处理失败');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Style preservation failed:', error);
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '文风保持服务暂时不可用';
        throw new Error(message);
      }
      
      throw new Error('文风保持处理失败，请重试');
    }
  }

  /**
   * 语法和拼写纠错
   */
  async correctSpellingAndGrammar(
    text: string
  ): Promise<{ originalText: string; correctedText: string; timestamp: string }> {
    try {
      const response = await apiClient.post<ApiResponse<any>>('/correct-grammar', {
        text,
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message || '语法纠错处理失败');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Grammar correction failed:', error);
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '语法纠错服务暂时不可用';
        throw new Error(message);
      }
      
      throw new Error('语法纠错处理失败，请重试');
    }
  }

  /**
   * 段落结构重组
   */
  async reorganizeParagraphs(
    text: string
  ): Promise<{ originalText: string; reorganizedText: string; timestamp: string }> {
    try {
      const response = await apiClient.post<ApiResponse<any>>('/reorganize', {
        text,
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message || '段落重组处理失败');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Paragraph reorganization failed:', error);
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '段落重组服务暂时不可用';
        throw new Error(message);
      }
      
      throw new Error('段落重组处理失败，请重试');
    }
  }

  /**
   * 获取AI编辑建议
   */
  async generateSuggestions(
    text: string
  ): Promise<{ text: string; suggestions: AISuggestion[]; timestamp: string }> {
    try {
      const response = await apiClient.post<ApiResponse<any>>('/suggestions', {
        text,
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message || '获取编辑建议失败');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Generate suggestions failed:', error);
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '编辑建议服务暂时不可用';
        throw new Error(message);
      }
      
      throw new Error('获取编辑建议失败，请重试');
    }
  }

  /**
   * 创建编辑会话
   */
  async createEditingSession(text: string): Promise<EditingSession> {
    try {
      const response = await apiClient.post<ApiResponse<EditingSession>>('/session', {
        text,
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message || '创建编辑会话失败');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Create editing session failed:', error);
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '编辑会话服务暂时不可用';
        throw new Error(message);
      }
      
      throw new Error('创建编辑会话失败，请重试');
    }
  }

  /**
   * 更新编辑会话
   */
  async updateEditingSession(sessionId: string, updates: Partial<EditingSession>): Promise<EditingSession> {
    try {
      const response = await apiClient.put<ApiResponse<EditingSession>>(`/session/${sessionId}`, updates);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || '更新编辑会话失败');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Update editing session failed:', error);
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '编辑会话服务暂时不可用';
        throw new Error(message);
      }
      
      throw new Error('更新编辑会话失败，请重试');
    }
  }

  /**
   * 批量编辑操作 - 组合多个编辑功能
   */
  async performBatchEdit(
    text: string,
    operations: {
      correctGrammar?: boolean;
      reorganizeStructure?: boolean;
      preserveStyle?: boolean;
      editingLevel?: 'light' | 'moderate' | 'heavy';
    } = {}
  ): Promise<EditingResult> {
    const options: EditingOptions = {
      level: operations.editingLevel || 'moderate',
      preserveStyle: operations.preserveStyle !== false,
      correctGrammar: operations.correctGrammar !== false,
      reorganizeStructure: operations.reorganizeStructure || false,
    };

    return this.editContent(text, options);
  }

  /**
   * 获取编辑历史对比
   */
  async getEditComparison(originalText: string, editedText: string): Promise<{
    additions: string[];
    deletions: string[];
    modifications: Array<{ original: string; edited: string }>;
  }> {
    // This is a client-side utility function for comparing texts
    // In a real implementation, you might want to use a library like diff
    
    const originalLines = originalText.split('\n');
    const editedLines = editedText.split('\n');
    
    const additions: string[] = [];
    const deletions: string[] = [];
    const modifications: Array<{ original: string; edited: string }> = [];

    // Simple line-by-line comparison
    const maxLines = Math.max(originalLines.length, editedLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const editedLine = editedLines[i] || '';
      
      if (originalLine && !editedLine) {
        deletions.push(originalLine);
      } else if (!originalLine && editedLine) {
        additions.push(editedLine);
      } else if (originalLine !== editedLine) {
        modifications.push({ original: originalLine, edited: editedLine });
      }
    }

    return { additions, deletions, modifications };
  }
}

// Export singleton instance
export const aiEditingService = new AIEditingServiceImpl();

// Export service class for testing
export { AIEditingServiceImpl };