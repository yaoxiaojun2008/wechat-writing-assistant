import { useState, useCallback } from 'react';
import { wechatService, ProgressCallback } from '../services/wechatService';
import { Draft, PublishOptions } from '../types/index';

interface UseWeChatReturn {
  // State
  drafts: Draft[];
  selectedDraft: Draft | null;
  isLoading: boolean;
  uploadProgress: number;
  error: string | null;
  isConfigured: boolean;

  // Actions
  saveToDraft: (title: string, content: string) => Promise<Draft | null>;
  refreshDrafts: () => Promise<void>;
  selectDraft: (draft: Draft | null) => void;
  publishDraft: (draftId: string, options: PublishOptions) => Promise<boolean>;
  scheduleDraft: (draftId: string, scheduledTime: Date, options: PublishOptions) => Promise<string | null>;
  checkServiceStatus: () => Promise<void>;
  clearError: () => void;
}

export const useWeChat = (): UseWeChatReturn => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check WeChat service status
   */
  const checkServiceStatus = useCallback(async () => {
    try {
      const status = await wechatService.getServiceStatus();
      setIsConfigured(status.configured);
    } catch (err) {
      console.error('Failed to check WeChat service status:', err);
      setIsConfigured(false);
    }
  }, []);

  /**
   * Save content as draft to WeChat
   */
  const saveToDraft = useCallback(async (title: string, content: string): Promise<Draft | null> => {
    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const onProgress: ProgressCallback = (progress) => {
        setUploadProgress(progress);
      };

      const result = await wechatService.saveToDraft(title, content, onProgress);
      
      // Add new draft to the list
      setDrafts(prev => [result.draft, ...prev]);
      
      setUploadProgress(100);
      return result.draft;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save draft';
      setError(errorMessage);
      setUploadProgress(0);
      return null;

    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh draft list from WeChat
   */
  const refreshDrafts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await wechatService.getDraftList();
      setDrafts(result.drafts);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch drafts';
      setError(errorMessage);

    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Select a draft
   */
  const selectDraft = useCallback((draft: Draft | null) => {
    setSelectedDraft(draft);
  }, []);

  /**
   * Publish a draft article
   */
  const publishDraft = useCallback(async (
    draftId: string, 
    options: PublishOptions
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await wechatService.publishArticle(draftId, options);
      
      // Update draft status in the list
      setDrafts(prev => prev.map(draft => 
        draft.wechatDraftId === draftId
          ? { ...draft, status: 'published', publishedAt: result.publishedAt }
          : draft
      ));

      return result.published;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish draft';
      setError(errorMessage);
      return false;

    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Schedule publication of a draft
   */
  const scheduleDraft = useCallback(async (
    draftId: string,
    scheduledTime: Date,
    options: PublishOptions
  ): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await wechatService.schedulePublication(draftId, scheduledTime, options);
      
      // Update draft status in the list
      setDrafts(prev => prev.map(draft => 
        draft.wechatDraftId === draftId
          ? { ...draft, status: 'scheduled', scheduledAt: scheduledTime }
          : draft
      ));

      return result.taskId;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule publication';
      setError(errorMessage);
      return null;

    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    drafts,
    selectedDraft,
    isLoading,
    uploadProgress,
    error,
    isConfigured,

    // Actions
    saveToDraft,
    refreshDrafts,
    selectDraft,
    publishDraft,
    scheduleDraft,
    checkServiceStatus,
    clearError,
  };
};

export default useWeChat;