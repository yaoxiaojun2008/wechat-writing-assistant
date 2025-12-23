import React, { useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material';
import { AccountCircle, ExitToApp } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { VoiceInputPanel } from './VoiceInputPanel';
import { EditingPanel } from './EditingPanel';
import { WorkspaceToolbar } from './WorkspaceToolbar';
import DraftManager from './DraftManager';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { useAIEditing } from '../hooks/useAIEditing';
import { useWeChat } from '../hooks/useWeChat';

export function MainWorkspace() {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  // Voice recording hook
  const {
    isRecording,
    isProcessing: isVoiceProcessing,
    transcribedText,
    error: voiceError,
    startRecording,
    stopRecording,
    clearText,
    testMicrophone,
  } = useVoiceRecording();

  // AI editing hook
  const aiEditing = useAIEditing();

  // WeChat integration hook
  const wechat = useWeChat();

  // Editing state
  const [editedContent, setEditedContent] = useState('');
  const [editHistory, setEditHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingError, setEditingError] = useState<string | null>(null);

  // Dialog states
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');

  // General state
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
    handleClose();
  };

  // Voice input handlers
  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    try {
      await stopRecording();
      // 移除自动AI编辑，现在用户可以手动点击"发给LLM"按钮
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }, [stopRecording]);

  const handleClearText = useCallback(() => {
    clearText();
    setEditedContent('');
    setEditHistory([]);
    setHistoryIndex(-1);
    setEditingError(null);
    aiEditing.reset();
  }, [clearText, aiEditing]);

  // Send voice text to LLM for processing
  const handleSendToLLM = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    console.log('🚀 Sending text to LLM:', text.substring(0, 100) + '...');
    setEditingError(null);
    
    try {
      const result = await aiEditing.editContent(text, {
        level: 'moderate', // 中等程度的编辑
        preserveStyle: true, // 保持写作风格
        correctGrammar: true, // 纠正语法
        reorganizeStructure: true, // 重新组织结构
      });
      
      console.log('✅ LLM processing completed:', result);
      
      if (result) {
        setEditedContent(result.editedText);
        
        // Add to history
        setEditHistory(prev => [...prev, result.editedText]);
        setHistoryIndex(prev => prev + 1);
        
        console.log('📝 Content updated in editor');
      }
    } catch (error) {
      console.error('❌ LLM processing failed:', error);
      setEditingError('LLM处理失败，请重试');
    }
  }, [aiEditing]);

  // AI editing handler - now uses real AI service
  const handleAIEdit = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setEditingError(null);
    
    try {
      const result = await aiEditing.editContent(text, {
        level: user?.preferences.aiEditingLevel || 'moderate',
        preserveStyle: true,
        correctGrammar: true,
        reorganizeStructure: false,
      });
      
      if (result) {
        setEditedContent(result.editedText);
        
        // Add to history
        setEditHistory(prev => [...prev, result.editedText]);
        setHistoryIndex(prev => prev + 1);
      }
    } catch (error) {
      setEditingError('AI编辑处理失败，请重试');
      console.error('AI editing failed:', error);
    }
  }, [aiEditing, user?.preferences.aiEditingLevel]);

  // Handle AI edit from EditingPanel
  const handleAIEditFromPanel = useCallback((editedText: string) => {
    setEditedContent(editedText);
    
    // Add to history
    setEditHistory(prev => [...prev, editedText]);
    setHistoryIndex(prev => prev + 1);
  }, []);

  // Content editing handlers
  const handleContentChange = useCallback((content: string) => {
    setEditedContent(content);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEditedContent(editHistory[newIndex]);
    }
  }, [historyIndex, editHistory]);

  const handleRedo = useCallback(() => {
    if (historyIndex < editHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEditedContent(editHistory[newIndex]);
    }
  }, [historyIndex, editHistory]);

  const handleSubmitToDraft = useCallback(async () => {
    if (!editedContent.trim()) return;
    
    // Generate a default title from the first line or first 50 characters
    const defaultTitle = editedContent.split('\n')[0].substring(0, 50) || '新文章';
    setDraftTitle(defaultTitle);
    setSubmitDialogOpen(true);
  }, [editedContent]);

  // Handle actual submission to WeChat
  const handleConfirmSubmit = useCallback(async () => {
    if (!editedContent.trim() || !draftTitle.trim()) return;
    
    setIsSubmitting(true);
    setEditingError(null);
    
    try {
      const result = await wechat.saveToDraft(draftTitle, editedContent);
      if (result) {
        setSuccessMessage('草稿已成功提交到微信公众号！');
        setSubmitDialogOpen(false);
        setDraftTitle('');
        
        // Optionally clear the content after successful submission
        // setEditedContent('');
        // setEditHistory([]);
        // setHistoryIndex(-1);
      }
    } catch (error) {
      setEditingError('提交草稿失败，请重试');
      console.error('Draft submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [editedContent, draftTitle, wechat]);

  // Toolbar handlers
  const handleRefresh = useCallback(() => {
    setIsProcessing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsProcessing(false);
    }, 1000);
  }, []);

  const handleOpenDrafts = useCallback(() => {
    setDraftDialogOpen(true);
  }, []);

  const handleOpenScheduler = useCallback(() => {
    console.log('Opening scheduler...');
    // TODO: Implement in task 10
  }, []);

  const handleOpenSettings = useCallback(() => {
    console.log('Opening settings...');
  }, []);

  const handleOpenHelp = useCallback(() => {
    console.log('Opening help...');
  }, []);

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            微信公众号写作助手
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              欢迎回来
            </Typography>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleLogout}>
                <ExitToApp sx={{ mr: 1 }} />
                退出登录
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
        {/* Workspace Toolbar */}
        <WorkspaceToolbar
          onRefresh={handleRefresh}
          onOpenDrafts={handleOpenDrafts}
          onOpenScheduler={handleOpenScheduler}
          onOpenSettings={handleOpenSettings}
          onOpenHelp={handleOpenHelp}
          isProcessing={isProcessing || aiEditing.isProcessing || isVoiceProcessing}
        />

        {/* Dual Dialog Box Layout */}
        <Grid container spacing={3}>
          {/* Upper Panel - Voice Input */}
          <Grid item xs={12}>
            <VoiceInputPanel
              transcribedText={transcribedText}
              isRecording={isRecording}
              isProcessing={isVoiceProcessing}
              error={voiceError}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onClearText={handleClearText}
              onTestMicrophone={testMicrophone}
              onSendToLLM={handleSendToLLM}
              isLLMProcessing={aiEditing.isProcessing}
            />
          </Grid>

          {/* Lower Panel - AI Editing */}
          <Grid item xs={12}>
            <EditingPanel
              editedContent={editedContent}
              isAIProcessing={aiEditing.isProcessing}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < editHistory.length - 1}
              isSubmitting={isSubmitting}
              error={editingError}
              onContentChange={handleContentChange}
              onSubmitToDraft={handleSubmitToDraft}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onAIEdit={handleAIEditFromPanel}
              userId={user?.id}
              autoSaveInterval={5000}
            />
          </Grid>
        </Grid>

        {/* User Info Section (for reference) */}
        <Box sx={{ mt: 4, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            用户ID: {user?.id}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            语音语言: {user?.preferences.voiceLanguage} | AI编辑级别: {user?.preferences.aiEditingLevel}
          </Typography>
        </Box>
      </Container>

      {/* Draft Manager Dialog */}
      <Dialog
        open={draftDialogOpen}
        onClose={() => setDraftDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>草稿管理</DialogTitle>
        <DialogContent>
          <DraftManager onDraftSelect={(draft) => {
            if (draft) {
              setEditedContent(draft.content);
              setDraftDialogOpen(false);
            }
          }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDraftDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* Submit to WeChat Dialog */}
      <Dialog
        open={submitDialogOpen}
        onClose={() => !isSubmitting && setSubmitDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>提交到微信草稿箱</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <TextField
              fullWidth
              label="文章标题"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="请输入文章标题"
              disabled={isSubmitting}
              autoFocus
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              上传进度: {wechat.uploadProgress}%
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialogOpen(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button
            onClick={handleConfirmSubmit}
            variant="contained"
            disabled={isSubmitting || !draftTitle.trim()}
          >
            {isSubmitting ? '提交中...' : '确认提交'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>

      {/* WeChat Error Snackbar */}
      <Snackbar
        open={!!wechat.error}
        autoHideDuration={6000}
        onClose={wechat.clearError}
      >
        <Alert onClose={wechat.clearError} severity="error">
          {wechat.error}
        </Alert>
      </Snackbar>
    </>
  );
}