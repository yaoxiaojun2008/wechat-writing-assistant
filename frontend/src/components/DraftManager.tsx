import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  LinearProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Publish as PublishIcon,
  Schedule as ScheduleIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useWeChat } from '../hooks/useWeChat';
import { Draft, PublishOptions } from '../types/index';

interface DraftManagerProps {
  onDraftSelect?: (draft: Draft | null) => void;
}

const DraftManager: React.FC<DraftManagerProps> = ({ onDraftSelect }) => {
  const {
    drafts,
    selectedDraft,
    isLoading,
    uploadProgress,
    error,
    isConfigured,
    refreshDrafts,
    selectDraft,
    publishDraft,
    scheduleDraft,
    checkServiceStatus,
    clearError,
  } = useWeChat();

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null);
  const [publishOptions, setPublishOptions] = useState<PublishOptions>({
    targetAudience: 'all',
    enableComments: true,
    enableSharing: true,
  });
  const [scheduledTime, setScheduledTime] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check service status on mount
  useEffect(() => {
    checkServiceStatus();
  }, [checkServiceStatus]);

  // Load drafts when configured
  useEffect(() => {
    if (isConfigured) {
      refreshDrafts();
    }
  }, [isConfigured, refreshDrafts]);

  const handleDraftSelect = (draft: Draft) => {
    selectDraft(draft);
    if (onDraftSelect) {
      onDraftSelect(draft);
    }
  };

  const handlePublishClick = (draft: Draft) => {
    setCurrentDraft(draft);
    setPublishDialogOpen(true);
  };

  const handleScheduleClick = (draft: Draft) => {
    setCurrentDraft(draft);
    setScheduleDialogOpen(true);
  };

  const handleViewClick = (draft: Draft) => {
    setCurrentDraft(draft);
    setViewDialogOpen(true);
  };

  const handlePublishConfirm = async () => {
    if (!currentDraft?.wechatDraftId) return;

    const success = await publishDraft(currentDraft.wechatDraftId, publishOptions);
    if (success) {
      setSuccessMessage('Article published successfully!');
      setPublishDialogOpen(false);
    }
  };

  const handleScheduleConfirm = async () => {
    if (!currentDraft?.wechatDraftId || !scheduledTime) return;

    const taskId = await scheduleDraft(
      currentDraft.wechatDraftId,
      new Date(scheduledTime),
      publishOptions
    );
    
    if (taskId) {
      setSuccessMessage('Publication scheduled successfully!');
      setScheduleDialogOpen(false);
    }
  };

  const getStatusColor = (status: Draft['status']) => {
    switch (status) {
      case 'local': return 'default';
      case 'uploaded': return 'primary';
      case 'published': return 'success';
      case 'scheduled': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: Draft['status']) => {
    switch (status) {
      case 'local': return '本地';
      case 'uploaded': return '已上传';
      case 'published': return '已发布';
      case 'scheduled': return '已安排';
      default: return status;
    }
  };

  if (!isConfigured) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            WeChat API is not configured. Please check your environment settings.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">草稿管理</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refreshDrafts}
          disabled={isLoading}
        >
          刷新
        </Button>
      </Box>

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <Box mb={2}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            上传进度: {uploadProgress}%
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {/* Draft List */}
      <Card>
        <CardContent>
          {isLoading && drafts.length === 0 ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : drafts.length === 0 ? (
            <Typography color="textSecondary" align="center">
              暂无草稿
            </Typography>
          ) : (
            <List>
              {drafts.map((draft) => (
                <ListItem
                  key={draft.id}
                  button
                  selected={selectedDraft?.id === draft.id}
                  onClick={() => handleDraftSelect(draft)}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">
                          {draft.title}
                        </Typography>
                        <Chip
                          label={getStatusLabel(draft.status)}
                          color={getStatusColor(draft.status)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          创建时间: {new Date(draft.createdAt).toLocaleString('zh-CN')}
                        </Typography>
                        {draft.publishedAt && (
                          <Typography variant="body2" color="textSecondary">
                            发布时间: {new Date(draft.publishedAt).toLocaleString('zh-CN')}
                          </Typography>
                        )}
                        {draft.scheduledAt && (
                          <Typography variant="body2" color="textSecondary">
                            计划发布: {new Date(draft.scheduledAt).toLocaleString('zh-CN')}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewClick(draft);
                      }}
                    >
                      <ViewIcon />
                    </IconButton>
                    {draft.status === 'uploaded' && (
                      <>
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePublishClick(draft);
                          }}
                        >
                          <PublishIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleScheduleClick(draft);
                          }}
                        >
                          <ScheduleIcon />
                        </IconButton>
                      </>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onClose={() => setPublishDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>发布文章</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <FormControl fullWidth margin="normal">
              <InputLabel>目标受众</InputLabel>
              <Select
                value={publishOptions.targetAudience}
                onChange={(e) => setPublishOptions(prev => ({
                  ...prev,
                  targetAudience: e.target.value as PublishOptions['targetAudience']
                }))}
              >
                <MenuItem value="all">所有用户</MenuItem>
                <MenuItem value="subscribers">订阅者</MenuItem>
                <MenuItem value="custom">自定义</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>评论设置</InputLabel>
              <Select
                value={publishOptions.enableComments ? 'true' : 'false'}
                onChange={(e) => setPublishOptions(prev => ({
                  ...prev,
                  enableComments: e.target.value === 'true'
                }))}
              >
                <MenuItem value="true">允许评论</MenuItem>
                <MenuItem value="false">禁止评论</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>分享设置</InputLabel>
              <Select
                value={publishOptions.enableSharing ? 'true' : 'false'}
                onChange={(e) => setPublishOptions(prev => ({
                  ...prev,
                  enableSharing: e.target.value === 'true'
                }))}
              >
                <MenuItem value="true">允许分享</MenuItem>
                <MenuItem value="false">禁止分享</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishDialogOpen(false)}>取消</Button>
          <Button onClick={handlePublishConfirm} variant="contained" disabled={isLoading}>
            {isLoading ? <CircularProgress size={20} /> : '发布'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>定时发布</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <TextField
              fullWidth
              label="发布时间"
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              margin="normal"
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>目标受众</InputLabel>
              <Select
                value={publishOptions.targetAudience}
                onChange={(e) => setPublishOptions(prev => ({
                  ...prev,
                  targetAudience: e.target.value as PublishOptions['targetAudience']
                }))}
              >
                <MenuItem value="all">所有用户</MenuItem>
                <MenuItem value="subscribers">订阅者</MenuItem>
                <MenuItem value="custom">自定义</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>评论设置</InputLabel>
              <Select
                value={publishOptions.enableComments ? 'true' : 'false'}
                onChange={(e) => setPublishOptions(prev => ({
                  ...prev,
                  enableComments: e.target.value === 'true'
                }))}
              >
                <MenuItem value="true">允许评论</MenuItem>
                <MenuItem value="false">禁止评论</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>分享设置</InputLabel>
              <Select
                value={publishOptions.enableSharing ? 'true' : 'false'}
                onChange={(e) => setPublishOptions(prev => ({
                  ...prev,
                  enableSharing: e.target.value === 'true'
                }))}
              >
                <MenuItem value="true">允许分享</MenuItem>
                <MenuItem value="false">禁止分享</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>取消</Button>
          <Button 
            onClick={handleScheduleConfirm} 
            variant="contained" 
            disabled={isLoading || !scheduledTime}
          >
            {isLoading ? <CircularProgress size={20} /> : '安排发布'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{currentDraft?.title}</Typography>
            <IconButton onClick={() => setViewDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
              {currentDraft?.content}
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
      >
        <Alert onClose={clearError} severity="error">
          {error}
        </Alert>
      </Snackbar>

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
    </Box>
  );
};

export default DraftManager;