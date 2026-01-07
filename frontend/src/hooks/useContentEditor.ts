import { useState, useCallback, useRef, useEffect } from 'react';
import { EditOperation, EditingSession } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface ContentEditorState {
  content: string;
  originalContent: string;
  editHistory: EditOperation[];
  currentHistoryIndex: number;
  hasUnsavedChanges: boolean;
  isAutoSaving: boolean;
  lastSavedAt: Date | null;
  editingSession: EditingSession | null;
  isCompleted: boolean;
}

export interface ContentEditorActions {
  setContent: (content: string, source?: 'user' | 'ai') => void;
  insertText: (text: string, position: number) => void;
  deleteText: (start: number, end: number) => void;
  replaceText: (start: number, end: number, newText: string) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  save: () => Promise<void>;
  markAsCompleted: () => void;
  markAsIncomplete: () => void;
  reset: () => void;
  createSession: (userId: string, initialContent: string) => void;
  getVersionHistory: () => EditOperation[];
  restoreVersion: (operationId: string) => void;
}

export interface ContentEditorOptions {
  autoSaveInterval?: number; // milliseconds
  maxHistorySize?: number;
  onAutoSave?: (content: string) => Promise<void>;
  onContentChange?: (content: string, hasChanges: boolean) => void;
  onSessionUpdate?: (session: EditingSession) => void;
}

export function useContentEditor(options: ContentEditorOptions = {}): ContentEditorState & ContentEditorActions {
  const {
    autoSaveInterval = 5000, // 5 seconds
    maxHistorySize = 100,
    onAutoSave,
    onContentChange,
    onSessionUpdate,
  } = options;

  const [state, setState] = useState<ContentEditorState>({
    content: '',
    originalContent: '',
    editHistory: [],
    currentHistoryIndex: -1,
    hasUnsavedChanges: false,
    isAutoSaving: false,
    lastSavedAt: null,
    editingSession: null,
    isCompleted: false,
  });

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastChangeTimeRef = useRef<Date>(new Date());

  // Auto-save functionality
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (state.hasUnsavedChanges && onAutoSave) {
        setState(prev => ({ ...prev, isAutoSaving: true }));
        try {
          await onAutoSave(state.content);
          setState(prev => ({
            ...prev,
            hasUnsavedChanges: false,
            isAutoSaving: false,
            lastSavedAt: new Date(),
          }));
        } catch (error) {
          console.error('Auto-save failed:', error);
          setState(prev => ({ ...prev, isAutoSaving: false }));
        }
      }
    }, autoSaveInterval);
  }, [state.hasUnsavedChanges, state.content, onAutoSave, autoSaveInterval]);

  // Create edit operation
  const createEditOperation = useCallback((
    type: EditOperation['type'],
    position: number,
    content: string,
    source: 'user' | 'ai' = 'user'
  ): EditOperation => {
    return {
      id: uuidv4(),
      type,
      position,
      content,
      timestamp: new Date(),
      source,
    };
  }, []);

  // Add operation to history
  const addToHistory = useCallback((operation: EditOperation) => {
    setState(prev => {
      // Remove any operations after current index (when undoing then making new changes)
      const newHistory = prev.editHistory.slice(0, prev.currentHistoryIndex + 1);
      newHistory.push(operation);

      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }

      const newIndex = newHistory.length - 1;

      return {
        ...prev,
        editHistory: newHistory,
        currentHistoryIndex: newIndex,
        hasUnsavedChanges: true,
      };
    });

    lastChangeTimeRef.current = new Date();
    scheduleAutoSave();
  }, [maxHistorySize, scheduleAutoSave]);

  // Update session
  const updateSession = useCallback((updates: Partial<EditingSession>) => {
    setState(prev => {
      if (!prev.editingSession) return prev;

      const updatedSession: EditingSession = {
        ...prev.editingSession,
        ...updates,
        updatedAt: new Date(),
      };

      if (onSessionUpdate) {
        onSessionUpdate(updatedSession);
      }

      return {
        ...prev,
        editingSession: updatedSession,
      };
    });
  }, [onSessionUpdate]);

  // Content manipulation actions
  const setContent = useCallback((content: string, source: 'user' | 'ai' = 'user') => {
    const operation = createEditOperation('replace', 0, content, source);
    
    setState(prev => ({
      ...prev,
      content,
      hasUnsavedChanges: true,
    }));

    addToHistory(operation);
    
    if (onContentChange) {
      onContentChange(content, true);
    }

    // Update session
    updateSession({
      editedText: content,
      editHistory: [...state.editHistory, operation],
    });
  }, [createEditOperation, addToHistory, onContentChange, updateSession, state.editHistory]);

  const insertText = useCallback((text: string, position: number) => {
    const operation = createEditOperation('insert', position, text);
    
    setState(prev => {
      const newContent = prev.content.slice(0, position) + text + prev.content.slice(position);
      
      if (onContentChange) {
        onContentChange(newContent, true);
      }

      return {
        ...prev,
        content: newContent,
        hasUnsavedChanges: true,
      };
    });

    addToHistory(operation);
    updateSession({
      editedText: state.content,
      editHistory: [...state.editHistory, operation],
    });
  }, [createEditOperation, addToHistory, onContentChange, updateSession, state.content, state.editHistory]);

  const deleteText = useCallback((start: number, end: number) => {
    const deletedText = state.content.slice(start, end);
    const operation = createEditOperation('delete', start, deletedText);
    
    setState(prev => {
      const newContent = prev.content.slice(0, start) + prev.content.slice(end);
      
      if (onContentChange) {
        onContentChange(newContent, true);
      }

      return {
        ...prev,
        content: newContent,
        hasUnsavedChanges: true,
      };
    });

    addToHistory(operation);
    updateSession({
      editedText: state.content,
      editHistory: [...state.editHistory, operation],
    });
  }, [state.content, createEditOperation, addToHistory, onContentChange, updateSession, state.editHistory]);

  const replaceText = useCallback((start: number, end: number, newText: string) => {
    const operation = createEditOperation('replace', start, newText);
    
    setState(prev => {
      const newContent = prev.content.slice(0, start) + newText + prev.content.slice(end);
      
      if (onContentChange) {
        onContentChange(newContent, true);
      }

      return {
        ...prev,
        content: newContent,
        hasUnsavedChanges: true,
      };
    });

    addToHistory(operation);
    updateSession({
      editedText: state.content,
      editHistory: [...state.editHistory, operation],
    });
  }, [state.content, createEditOperation, addToHistory, onContentChange, updateSession, state.editHistory]);

  // Undo/Redo functionality
  const undo = useCallback((): boolean => {
    if (state.currentHistoryIndex <= 0) return false;

    const newIndex = state.currentHistoryIndex - 1;
    
    setState(prev => {
      let newContent = prev.originalContent;
      
      // Replay operations up to the target index
      for (let i = 0; i <= newIndex; i++) {
        const op = prev.editHistory[i];
        switch (op.type) {
          case 'insert':
            newContent = newContent.slice(0, op.position) + op.content + newContent.slice(op.position);
            break;
          case 'delete':
            // For undo, we need to restore the deleted text
            newContent = newContent.slice(0, op.position) + op.content + newContent.slice(op.position);
            break;
          case 'replace':
            newContent = op.content;
            break;
        }
      }

      if (onContentChange) {
        onContentChange(newContent, newIndex >= 0);
      }

      return {
        ...prev,
        content: newContent,
        currentHistoryIndex: newIndex,
        hasUnsavedChanges: newIndex >= 0,
      };
    });

    updateSession({
      editedText: state.content,
    });

    return true;
  }, [state.currentHistoryIndex, state.editHistory, state.originalContent, onContentChange, updateSession, state.content]);

  const redo = useCallback((): boolean => {
    if (state.currentHistoryIndex >= state.editHistory.length - 1) return false;

    const newIndex = state.currentHistoryIndex + 1;
    const operation = state.editHistory[newIndex];
    
    setState(prev => {
      let newContent = prev.content;
      
      switch (operation.type) {
        case 'insert':
          newContent = newContent.slice(0, operation.position) + operation.content + newContent.slice(operation.position);
          break;
        case 'delete':
          const endPos = operation.position + operation.content.length;
          newContent = newContent.slice(0, operation.position) + newContent.slice(endPos);
          break;
        case 'replace':
          newContent = operation.content;
          break;
      }

      if (onContentChange) {
        onContentChange(newContent, true);
      }

      return {
        ...prev,
        content: newContent,
        currentHistoryIndex: newIndex,
        hasUnsavedChanges: true,
      };
    });

    updateSession({
      editedText: state.content,
    });

    return true;
  }, [state.currentHistoryIndex, state.editHistory, state.content, onContentChange, updateSession]);

  const canUndo = useCallback((): boolean => {
    return state.currentHistoryIndex > 0;
  }, [state.currentHistoryIndex]);

  const canRedo = useCallback((): boolean => {
    return state.currentHistoryIndex < state.editHistory.length - 1;
  }, [state.currentHistoryIndex, state.editHistory.length]);

  // Save functionality
  const save = useCallback(async (): Promise<void> => {
    if (!state.hasUnsavedChanges) return;

    setState(prev => ({ ...prev, isAutoSaving: true }));

    try {
      if (onAutoSave) {
        await onAutoSave(state.content);
      }

      setState(prev => ({
        ...prev,
        hasUnsavedChanges: false,
        isAutoSaving: false,
        lastSavedAt: new Date(),
      }));

      updateSession({
        status: 'completed',
      });
    } catch (error) {
      setState(prev => ({ ...prev, isAutoSaving: false }));
      throw error;
    }
  }, [state.hasUnsavedChanges, state.content, onAutoSave, updateSession]);

  // Completion state management
  const markAsCompleted = useCallback(() => {
    setState(prev => ({ ...prev, isCompleted: true }));
    updateSession({ status: 'completed' });
  }, [updateSession]);

  const markAsIncomplete = useCallback(() => {
    setState(prev => ({ ...prev, isCompleted: false }));
    updateSession({ status: 'editing' });
  }, [updateSession]);

  // Reset functionality
  const reset = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    setState({
      content: '',
      originalContent: '',
      editHistory: [],
      currentHistoryIndex: -1,
      hasUnsavedChanges: false,
      isAutoSaving: false,
      lastSavedAt: null,
      editingSession: null,
      isCompleted: false,
    });
  }, []);

  // Session management
  const createSession = useCallback((userId: string, initialContent: string) => {
    const session: EditingSession = {
      id: uuidv4(),
      userId,
      originalText: initialContent,
      editedText: initialContent,
      editHistory: [],
      aiSuggestions: [],
      status: 'editing',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setState(prev => ({
      ...prev,
      content: initialContent,
      originalContent: initialContent,
      editHistory: [],
      currentHistoryIndex: -1,
      hasUnsavedChanges: false,
      editingSession: session,
      isCompleted: false,
    }));

    if (onSessionUpdate) {
      onSessionUpdate(session);
    }
  }, [onSessionUpdate]);

  // Version history
  const getVersionHistory = useCallback((): EditOperation[] => {
    return [...state.editHistory];
  }, [state.editHistory]);

  const restoreVersion = useCallback((operationId: string) => {
    const operationIndex = state.editHistory.findIndex(op => op.id === operationId);
    if (operationIndex === -1) return;

    setState(prev => {
      let newContent = prev.originalContent;
      
      // Replay operations up to the target operation
      for (let i = 0; i <= operationIndex; i++) {
        const op = prev.editHistory[i];
        switch (op.type) {
          case 'insert':
            newContent = newContent.slice(0, op.position) + op.content + newContent.slice(op.position);
            break;
          case 'delete':
            // Skip delete operations when restoring
            break;
          case 'replace':
            newContent = op.content;
            break;
        }
      }

      if (onContentChange) {
        onContentChange(newContent, true);
      }

      return {
        ...prev,
        content: newContent,
        currentHistoryIndex: operationIndex,
        hasUnsavedChanges: true,
      };
    });
  }, [state.editHistory, state.originalContent, onContentChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    setContent,
    insertText,
    deleteText,
    replaceText,
    undo,
    redo,
    canUndo,
    canRedo,
    save,
    markAsCompleted,
    markAsIncomplete,
    reset,
    createSession,
    getVersionHistory,
    restoreVersion,
  };
}