import { useState, useCallback } from 'react';
import { aiEditingService } from '../services/aiEditingService.js';
import { EditingOptions, EditingResult, AISuggestion, EditingSession } from '../types/index.js';

export interface AIEditingState {
  isProcessing: boolean;
  error: string | null;
  lastResult: EditingResult | null;
  suggestions: AISuggestion[];
  currentSession: EditingSession | null;
}

export interface AIEditingActions {
  editContent: (text: string, options?: Partial<EditingOptions>) => Promise<EditingResult | null>;
  preserveStyle: (text: string, styleReference?: string) => Promise<string | null>;
  correctGrammar: (text: string) => Promise<string | null>;
  reorganizeParagraphs: (text: string) => Promise<string | null>;
  generateSuggestions: (text: string) => Promise<AISuggestion[]>;
  createSession: (text: string) => Promise<EditingSession | null>;
  updateSession: (sessionId: string, updates: Partial<EditingSession>) => Promise<EditingSession | null>;
  clearError: () => void;
  reset: () => void;
}

export function useAIEditing(): AIEditingState & AIEditingActions {
  const [state, setState] = useState<AIEditingState>({
    isProcessing: false,
    error: null,
    lastResult: null,
    suggestions: [],
    currentSession: null,
  });

  const setProcessing = useCallback((processing: boolean) => {
    setState(prev => ({ ...prev, isProcessing: processing }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      error: null,
      lastResult: null,
      suggestions: [],
      currentSession: null,
    });
  }, []);

  const editContent = useCallback(async (
    text: string, 
    options?: Partial<EditingOptions>
  ): Promise<EditingResult | null> => {
    if (!text.trim()) {
      setError('文本内容不能为空');
      return null;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await aiEditingService.editContent(text, options);
      setState(prev => ({ ...prev, lastResult: result }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI编辑失败';
      setError(errorMessage);
      return null;
    } finally {
      setProcessing(false);
    }
  }, [setProcessing, setError]);

  const preserveStyle = useCallback(async (
    text: string, 
    styleReference?: string
  ): Promise<string | null> => {
    if (!text.trim()) {
      setError('文本内容不能为空');
      return null;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await aiEditingService.preserveWritingStyle(text, styleReference);
      return result.editedText;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '文风保持处理失败';
      setError(errorMessage);
      return null;
    } finally {
      setProcessing(false);
    }
  }, [setProcessing, setError]);

  const correctGrammar = useCallback(async (text: string): Promise<string | null> => {
    if (!text.trim()) {
      setError('文本内容不能为空');
      return null;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await aiEditingService.correctSpellingAndGrammar(text);
      return result.correctedText;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '语法纠错失败';
      setError(errorMessage);
      return null;
    } finally {
      setProcessing(false);
    }
  }, [setProcessing, setError]);

  const reorganizeParagraphs = useCallback(async (text: string): Promise<string | null> => {
    if (!text.trim()) {
      setError('文本内容不能为空');
      return null;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await aiEditingService.reorganizeParagraphs(text);
      return result.reorganizedText;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '段落重组失败';
      setError(errorMessage);
      return null;
    } finally {
      setProcessing(false);
    }
  }, [setProcessing, setError]);

  const generateSuggestions = useCallback(async (text: string): Promise<AISuggestion[]> => {
    if (!text.trim()) {
      setError('文本内容不能为空');
      return [];
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await aiEditingService.generateSuggestions(text);
      setState(prev => ({ ...prev, suggestions: result.suggestions }));
      return result.suggestions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取编辑建议失败';
      setError(errorMessage);
      return [];
    } finally {
      setProcessing(false);
    }
  }, [setProcessing, setError]);

  const createSession = useCallback(async (text: string): Promise<EditingSession | null> => {
    if (!text.trim()) {
      setError('文本内容不能为空');
      return null;
    }

    setProcessing(true);
    setError(null);

    try {
      const session = await aiEditingService.createEditingSession(text);
      setState(prev => ({ ...prev, currentSession: session }));
      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建编辑会话失败';
      setError(errorMessage);
      return null;
    } finally {
      setProcessing(false);
    }
  }, [setProcessing, setError]);

  const updateSession = useCallback(async (
    sessionId: string, 
    updates: Partial<EditingSession>
  ): Promise<EditingSession | null> => {
    setProcessing(true);
    setError(null);

    try {
      const session = await aiEditingService.updateEditingSession(sessionId, updates);
      setState(prev => ({ ...prev, currentSession: session }));
      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新编辑会话失败';
      setError(errorMessage);
      return null;
    } finally {
      setProcessing(false);
    }
  }, [setProcessing, setError]);

  return {
    ...state,
    editContent,
    preserveStyle,
    correctGrammar,
    reorganizeParagraphs,
    generateSuggestions,
    createSession,
    updateSession,
    clearError,
    reset,
  };
}

// Additional utility hook for batch operations
export function useAIEditingBatch() {
  const [batchState, setBatchState] = useState({
    isProcessing: false,
    completedOperations: 0,
    totalOperations: 0,
    currentOperation: '',
    results: [] as Array<{ operation: string; result: any; error?: string }>,
  });

  const performBatchEdit = useCallback(async (
    text: string,
    operations: Array<{
      type: 'edit' | 'grammar' | 'reorganize' | 'style';
      options?: any;
    }>
  ) => {
    setBatchState({
      isProcessing: true,
      completedOperations: 0,
      totalOperations: operations.length,
      currentOperation: '',
      results: [],
    });

    const results: Array<{ operation: string; result: any; error?: string }> = [];

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      
      setBatchState(prev => ({
        ...prev,
        currentOperation: operation.type,
        completedOperations: i,
      }));

      try {
        let result;
        switch (operation.type) {
          case 'edit':
            result = await aiEditingService.editContent(text, operation.options);
            break;
          case 'grammar':
            result = await aiEditingService.correctSpellingAndGrammar(text);
            break;
          case 'reorganize':
            result = await aiEditingService.reorganizeParagraphs(text);
            break;
          case 'style':
            result = await aiEditingService.preserveWritingStyle(text, operation.options?.styleReference);
            break;
          default:
            throw new Error(`Unknown operation type: ${operation.type}`);
        }

        results.push({ operation: operation.type, result });
        
        // Update text for next operation if it's an editing result
        if (result && typeof result === 'object' && 'editedText' in result) {
          text = result.editedText;
        } else if (typeof result === 'string') {
          text = result;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Operation failed';
        results.push({ operation: operation.type, result: null, error: errorMessage });
      }
    }

    setBatchState({
      isProcessing: false,
      completedOperations: operations.length,
      totalOperations: operations.length,
      currentOperation: '',
      results,
    });

    return results;
  }, []);

  const resetBatch = useCallback(() => {
    setBatchState({
      isProcessing: false,
      completedOperations: 0,
      totalOperations: 0,
      currentOperation: '',
      results: [],
    });
  }, []);

  return {
    ...batchState,
    performBatchEdit,
    resetBatch,
  };
}