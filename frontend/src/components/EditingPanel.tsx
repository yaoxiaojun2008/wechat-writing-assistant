import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  Menu,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Edit,
  Undo,
  Redo,
  Save,
  CloudUpload,
  AutoAwesome,
  Spellcheck,
  FormatAlignLeft,
  Style,
  History,
  CheckCircle,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import { useAIEditing } from '../hooks/useAIEditing.js';
import { useContentEditor } from '../hooks/useContentEditor.js';
import { RichTextEditor } from './RichTextEditor.js';
import { VersionHistory } from './VersionHistory.js';
import { EditingOptions } from '../types/index.js';

interface EditingPanelProps {
  editedContent: string;
  isAIProcessing: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  isSubmitting: boolean;
  error: string | null;
  onContentChange: (content: string) => void;
  onSubmitToDraft: () => Promise<void>;
  onUndo?: () => void;
  onRedo?: () => void;
  onManualSave?: () => void;
  onAIEdit?: (editedText: string) => void;
  userId?: string;
  autoSaveInterval?: number;
}

export function EditingPanel({
  editedContent,
  isAIProcessing,
  canUndo = false,
  canRedo = false,
  isSubmitting,
  error,
  onContentChange,
  onSubmitToDraft,
  onUndo,
  onRedo,
  onManualSave,
  onAIEdit,
  userId = 'default-user',
  autoSaveInterval = 5000,
}: EditingPanelProps) {
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const [aiMenuAnchor, setAiMenuAnchor] = useState<null | HTMLElement>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [fontSize, setFontSize] = useState(14);
  const [editingOptions, setEditingOptions] = useState<EditingOptions>({
    level: 'moderate',
    preserveStyle: true,
    correctGrammar: true,
    reorganizeStructure: false,
  });

  const aiEditing = useAIEditing();

  // Initialize content editor with enhanced functionality
  const contentEditor = useContentEditor({
    autoSaveInterval,
    maxHistorySize: 100,
    onAutoSave: async (content: string) => {
      if (onManualSave) {
        await onManualSave();
      }
    },
    onContentChange: (content: string, hasChanges: boolean) => {
      onContentChange(content);
    },
    onSessionUpdate: (session) => {
      console.log('Editing session updated:', session.id);
    },
  });

  // Initialize session when content changes from parent
  useEffect(() => {
    if (editedContent && !contentEditor.editingSession) {
      contentEditor.createSession(userId, editedContent);
    } else if (editedContent !== contentEditor.content) {
      contentEditor.setContent(editedContent, 'ai');
    }
  }, [editedContent, userId, contentEditor]);

  // Handle content changes from rich text editor
  const handleRichTextChange = useCallback((newContent: string) => {
    contentEditor.setContent(newContent, 'user');
  }, [contentEditor]);

  // Handle undo/redo - use internal editor or fallback to parent
  const handleUndo = useCallback(() => {
    if (contentEditor.canUndo()) {
      contentEditor.undo();
    } else if (onUndo) {
      onUndo();
    }
  }, [contentEditor, onUndo]);

  const handleRedo = useCallback(() => {
    if (contentEditor.canRedo()) {
      contentEditor.redo();
    } else if (onRedo) {
      onRedo();
    }
  }, [contentEditor, onRedo]);

  // Determine undo/redo availability
  const canUndoAction = contentEditor.canUndo() || canUndo;
  const canRedoAction = contentEditor.canRedo() || canRedo;

  const handleSubmit = async () => {
    try {
      await onSubmitToDraft();
      contentEditor.markAsCompleted();
    } catch (error) {
      // Error handling is managed by parent component
    }
  };

  const handleManualSave = async () => {
    try {
      await contentEditor.save();
    } catch (error) {
      console.error('Manual save failed:', error);
    }
  };

  // AI Editing handlers
  const handleAIEdit = async () => {
    if (!contentEditor.content.trim()) return;
    
    const result = await aiEditing.editContent(contentEditor.content, editingOptions);
    if (result && onAIEdit) {
      onAIEdit(result.editedText);
      contentEditor.setContent(result.editedText, 'ai');
    }
    setAiMenuAnchor(null);
  };

  const handleGrammarCorrection = async () => {
    if (!contentEditor.content.trim()) return;
    
    const correctedText = await aiEditing.correctGrammar(contentEditor.content);
    if (correctedText && onAIEdit) {
      onAIEdit(correctedText);
      contentEditor.setContent(correctedText, 'ai');
    }
    setAiMenuAnchor(null);
  };

  const handleReorganize = async () => {
    if (!contentEditor.content.trim()) return;
    
    const reorganizedText = await aiEditing.reorganizeParagraphs(contentEditor.content);
    if (reorganizedText && onAIEdit) {
      onAIEdit(reorganizedText);
      contentEditor.setContent(reorganizedText, 'ai');
    }
    setAiMenuAnchor(null);
  };

  const handleStylePreservation = async () => {
    if (!contentEditor.content.trim()) return;
    
    const styledText = await aiEditing.preserveStyle(contentEditor.content);
    if (styledText && onAIEdit) {
      onAIEdit(styledText);
      contentEditor.setContent(styledText, 'ai');
    }
    setAiMenuAnchor(null);
  };

  const handleAIMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAiMenuAnchor(event.currentTarget);
  };

  const handleAIMenuClose = () => {
    setAiMenuAnchor(null);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleVersionRestore = (operationId: string) => {
    contentEditor.restoreVersion(operationId);
  };

  // Auto-focus when content is available
  useEffect(() => {
    if (contentEditor.content && textFieldRef.current) {
      textFieldRef.current.focus();
    }
  }, [contentEditor.content]);

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        height: '500px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8f9fa',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <Edit sx={{ mr: 1 }} />
          AI编辑内容
          {isAIProcessing && (
            <Chip
              icon={<AutoAwesome />}
              label="AI处理中"
              size="small"
              color="primary"
              sx={{ ml: 2 }}
            />
          )}
          {contentEditor.isCompleted && (
            <Chip
              icon={<CheckCircle />}
              label="编辑完成"
              size="small"
              color="success"
              sx={{ ml: 2 }}
            />
          )}
        </Typography>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            onClick={handleUndo}
            disabled={!canUndoAction || isAIProcessing || aiEditing.isProcessing}
            title="撤销"
          >
            <Undo />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleRedo}
            disabled={!canRedoAction || isAIProcessing || aiEditing.isProcessing}
            title="重做"
          >
            <Redo />
          </IconButton>
          
          <IconButton
            size="small"
            onClick={() => setHistoryDialogOpen(true)}
            disabled={contentEditor.editHistory.length === 0}
            title="版本历史"
          >
            <History />
          </IconButton>
          
          {/* AI Editing Menu */}
          <Tooltip title="AI编辑选项">
            <IconButton
              size="small"
              onClick={handleAIMenuOpen}
              disabled={!contentEditor.content.trim() || isAIProcessing || aiEditing.isProcessing}
              color={aiEditing.isProcessing ? "primary" : "default"}
            >
              {aiEditing.isProcessing ? <CircularProgress size={16} /> : <AutoAwesome />}
            </IconButton>
          </Tooltip>
          
          <Button
            size="small"
            startIcon={contentEditor.isAutoSaving ? <CircularProgress size={16} /> : <Save />}
            onClick={handleManualSave}
            disabled={!contentEditor.hasUnsavedChanges || isAIProcessing || aiEditing.isProcessing}
          >
            {contentEditor.isAutoSaving ? '保存中...' : '保存'}
          </Button>
        </Box>
      </Box>

      {/* Status Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        {contentEditor.hasUnsavedChanges && (
          <Chip
            icon={<RadioButtonUnchecked />}
            label="有未保存的更改"
            size="small"
            color="warning"
            variant="outlined"
          />
        )}
        
        {contentEditor.lastSavedAt && (
          <Typography variant="caption" color="text.secondary">
            上次保存: {contentEditor.lastSavedAt.toLocaleTimeString()}
          </Typography>
        )}
        
        {contentEditor.editHistory.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            版本: {contentEditor.currentHistoryIndex + 1}/{contentEditor.editHistory.length}
          </Typography>
        )}
      </Box>

      {/* Main Content Area with Tabs */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="编辑器" />
          <Tab label="版本历史" disabled={contentEditor.editHistory.length === 0} />
        </Tabs>

        {currentTab === 0 && (
          <Box sx={{ flex: 1 }}>
            <RichTextEditor
              value={contentEditor.content}
              onChange={handleRichTextChange}
              disabled={isAIProcessing || aiEditing.isProcessing}
              placeholder="AI编辑后的内容将显示在这里，您可以进一步修改..."
              autoFocus={true}
              showToolbar={true}
              showWordCount={true}
              showCharacterCount={true}
              fontSize={fontSize}
              onFontSizeChange={setFontSize}
            />
          </Box>
        )}

        {currentTab === 1 && (
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <VersionHistory
              operations={contentEditor.getVersionHistory()}
              currentIndex={contentEditor.currentHistoryIndex}
              onRestoreVersion={handleVersionRestore}
              showDetails={true}
            />
          </Box>
        )}

        {/* Error Display */}
        {(error || aiEditing.error) && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error || aiEditing.error}
          </Alert>
        )}

        {/* Submit Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={contentEditor.isCompleted}
                  onChange={(e) => e.target.checked ? contentEditor.markAsCompleted() : contentEditor.markAsIncomplete()}
                  size="small"
                />
              }
              label="标记为完成"
            />
          </Box>
          
          <Button
            variant="contained"
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <CloudUpload />}
            onClick={handleSubmit}
            disabled={!contentEditor.content.trim() || isAIProcessing || isSubmitting || aiEditing.isProcessing}
            sx={{ minWidth: 140 }}
          >
            {isSubmitting ? '提交中...' : '提交到微信草稿箱'}
          </Button>
        </Box>
      </Box>

      {/* AI Editing Menu */}
      <Menu
        anchorEl={aiMenuAnchor}
        open={Boolean(aiMenuAnchor)}
        onClose={handleAIMenuClose}
        slotProps={{
          paper: {
            sx: { minWidth: 280 }
          }
        }}
      >
        <MenuItem onClick={handleAIEdit}>
          <AutoAwesome sx={{ mr: 2 }} />
          智能编辑优化
        </MenuItem>
        <MenuItem onClick={handleGrammarCorrection}>
          <Spellcheck sx={{ mr: 2 }} />
          语法拼写纠错
        </MenuItem>
        <MenuItem onClick={handleReorganize}>
          <FormatAlignLeft sx={{ mr: 2 }} />
          段落结构重组
        </MenuItem>
        <MenuItem onClick={handleStylePreservation}>
          <Style sx={{ mr: 2 }} />
          保持写作风格
        </MenuItem>
        
        <Divider sx={{ my: 1 }} />
        
        {/* Editing Options */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            编辑选项
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={editingOptions.preserveStyle}
                onChange={(e) => setEditingOptions(prev => ({ ...prev, preserveStyle: e.target.checked }))}
              />
            }
            label="保持文风"
            sx={{ display: 'block', mb: 0.5 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={editingOptions.correctGrammar}
                onChange={(e) => setEditingOptions(prev => ({ ...prev, correctGrammar: e.target.checked }))}
              />
            }
            label="纠正语法"
            sx={{ display: 'block', mb: 0.5 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={editingOptions.reorganizeStructure}
                onChange={(e) => setEditingOptions(prev => ({ ...prev, reorganizeStructure: e.target.checked }))}
              />
            }
            label="重组结构"
            sx={{ display: 'block' }}
          />
        </Box>
      </Menu>

      {/* Version History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          版本历史管理
        </DialogTitle>
        
        <DialogContent>
          <VersionHistory
            operations={contentEditor.getVersionHistory()}
            currentIndex={contentEditor.currentHistoryIndex}
            onRestoreVersion={handleVersionRestore}
            showDetails={true}
            maxDisplayItems={50}
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}