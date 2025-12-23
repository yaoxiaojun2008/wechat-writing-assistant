import axios from 'axios';
import { EditingSession, EditOperation, ApiResponse } from '../types/index.js';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ContentEditingServiceImpl {
  private baseURL = `${API_BASE_URL}/content-editing`;

  async createEditingSession(originalText: string): Promise<EditingSession> {
    try {
      const response = await axios.post<ApiResponse<EditingSession>>(
        `${this.baseURL}/sessions`,
        { originalText },
        { withCredentials: true }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || '创建编辑会话失败');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '创建编辑会话失败';
        throw new Error(message);
      }
      throw error;
    }
  }

  async getEditingSession(sessionId: string): Promise<EditingSession> {
    try {
      const response = await axios.get<ApiResponse<EditingSession>>(
        `${this.baseURL}/sessions/${sessionId}`,
        { withCredentials: true }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || '获取编辑会话失败');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '获取编辑会话失败';
        throw new Error(message);
      }
      throw error;
    }
  }

  async updateEditingSession(sessionId: string, updates: Partial<EditingSession>): Promise<EditingSession> {
    try {
      const response = await axios.put<ApiResponse<EditingSession>>(
        `${this.baseURL}/sessions/${sessionId}`,
        updates,
        { withCredentials: true }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || '更新编辑会话失败');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '更新编辑会话失败';
        throw new Error(message);
      }
      throw error;
    }
  }

  async deleteEditingSession(sessionId: string): Promise<boolean> {
    try {
      const response = await axios.delete<ApiResponse<{ deleted: boolean }>>(
        `${this.baseURL}/sessions/${sessionId}`,
        { withCredentials: true }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || '删除编辑会话失败');
      }

      return response.data.data.deleted;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '删除编辑会话失败';
        throw new Error(message);
      }
      throw error;
    }
  }

  async addEditOperation(
    sessionId: string,
    operation: Omit<EditOperation, 'id' | 'timestamp'>
  ): Promise<EditOperation> {
    try {
      const response = await axios.post<ApiResponse<EditOperation>>(
        `${this.baseURL}/sessions/${sessionId}/operations`,
        operation,
        { withCredentials: true }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || '添加编辑操作失败');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '添加编辑操作失败';
        throw new Error(message);
      }
      throw error;
    }
  }

  async getEditHistory(sessionId: string): Promise<EditOperation[]> {
    try {
      const response = await axios.get<ApiResponse<EditOperation[]>>(
        `${this.baseURL}/sessions/${sessionId}/history`,
        { withCredentials: true }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || '获取编辑历史失败');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '获取编辑历史失败';
        throw new Error(message);
      }
      throw error;
    }
  }

  async saveContent(sessionId: string, content: string): Promise<void> {
    try {
      const response = await axios.post<ApiResponse<{ saved: boolean }>>(
        `${this.baseURL}/sessions/${sessionId}/save`,
        { content },
        { withCredentials: true }
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || '保存内容失败');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '保存内容失败';
        throw new Error(message);
      }
      throw error;
    }
  }

  async restoreVersion(sessionId: string, operationId: string): Promise<string> {
    try {
      const response = await axios.post<ApiResponse<{ content: string }>>(
        `${this.baseURL}/sessions/${sessionId}/restore/${operationId}`,
        {},
        { withCredentials: true }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || '恢复版本失败');
      }

      return response.data.data.content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '恢复版本失败';
        throw new Error(message);
      }
      throw error;
    }
  }

  async getUserEditingSessions(): Promise<EditingSession[]> {
    try {
      const response = await axios.get<ApiResponse<EditingSession[]>>(
        `${this.baseURL}/sessions`,
        { withCredentials: true }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || '获取编辑会话列表失败');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '获取编辑会话列表失败';
        throw new Error(message);
      }
      throw error;
    }
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    totalOperations: number;
  }> {
    try {
      const response = await axios.get<ApiResponse<{
        totalSessions: number;
        activeSessions: number;
        completedSessions: number;
        totalOperations: number;
      }>>(
        `${this.baseURL}/stats`,
        { withCredentials: true }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || '获取统计信息失败');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || '获取统计信息失败';
        throw new Error(message);
      }
      throw error;
    }
  }
}

export const contentEditingService = new ContentEditingServiceImpl();