import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Tooltip,
  Collapse,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  History,
  Restore,
  ExpandMore,
  ExpandLess,
  Person,
  SmartToy,
  Visibility,
  Delete,
  Edit,
} from '@mui/icons-material';
import { EditOperation } from '../types/index.js';

export interface VersionHistoryProps {
  operations: EditOperation[];
  currentIndex: number;
  onRestoreVersion: (operationId: string) => void;
  onPreviewVersion?: (operationId: string) => void;
  maxDisplayItems?: number;
  showDetails?: boolean;
}

export function VersionHistory({
  operations,
  currentIndex,
  onRestoreVersion,
  onPreviewVersion,
  maxDisplayItems = 20,
  showDetails = false,
}: VersionHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    operation: EditOperation | null;
  }>({ open: false, operation: null });

  // Get display operations (most recent first)
  const displayOperations = operations
    .slice()
    .reverse()
    .slice(0, expanded ? operations.length : maxDisplayItems);

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return '刚刚';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return timestamp.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getOperationIcon = (operation: EditOperation) => {
    switch (operation.type) {
      case 'insert':
        return <Edit sx={{ fontSize: 16 }} />;
      case 'delete':
        return <Delete sx={{ fontSize: 16 }} />;
      case 'replace':
        return <Restore sx={{ fontSize: 16 }} />;
      default:
        return <Edit sx={{ fontSize: 16 }} />;
    }
  };

  const getOperationDescription = (operation: EditOperation) => {
    const contentPreview = operation.content.length > 50 
      ? operation.content.substring(0, 50) + '...'
      : operation.content;

    switch (operation.type) {
      case 'insert':
        return `插入文本: "${contentPreview}"`;
      case 'delete':
        return `删除文本: "${contentPreview}"`;
      case 'replace':
        return `替换内容 (${operation.content.length} 字符)`;
      default:
        return `编辑操作: "${contentPreview}"`;
    }
  };

  const getSourceChip = (source: 'user' | 'ai') => {
    return source === 'ai' ? (
      <Chip
        icon={<SmartToy />}
        label="AI"
        size="small"
        color="primary"
        variant="outlined"
      />
    ) : (
      <Chip
        icon={<Person />}
        label="用户"
        size="small"
        color="default"
        variant="outlined"
      />
    );
  };

  const handlePreview = (operation: EditOperation) => {
    setPreviewDialog({ open: true, operation });
    if (onPreviewVersion) {
      onPreviewVersion(operation.id);
    }
  };

  const handleClosePreview = () => {
    setPreviewDialog({ open: false, operation: null });
  };

  const isCurrentVersion = (operationIndex: number) => {
    const actualIndex = operations.length - 1 - operationIndex;
    return actualIndex === currentIndex;
  };

  if (operations.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <History sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          暂无编辑历史
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <History sx={{ mr: 1 }} />
        <Typography variant="h6">
          版本历史
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          ({operations.length} 个版本)
        </Typography>
      </Box>

      <List dense>
        {displayOperations.map((operation, index) => {
          const isCurrent = isCurrentVersion(index);
          
          return (
            <ListItem
              key={operation.id}
              sx={{
                border: isCurrent ? '2px solid' : '1px solid',
                borderColor: isCurrent ? 'primary.main' : 'divider',
                borderRadius: 1,
                mb: 1,
                backgroundColor: isCurrent ? 'primary.50' : 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                {getOperationIcon(operation)}
              </Box>

              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">
                      {getOperationDescription(operation)}
                    </Typography>
                    {getSourceChip(operation.source)}
                    {isCurrent && (
                      <Chip
                        label="当前版本"
                        size="small"
                        color="primary"
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimestamp(operation.timestamp)}
                    </Typography>
                    {showDetails && (
                      <Typography variant="caption" color="text.secondary">
                        • 位置: {operation.position}
                      </Typography>
                    )}
                  </Box>
                }
              />

              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="预览此版本">
                    <IconButton
                      size="small"
                      onClick={() => handlePreview(operation)}
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  
                  {!isCurrent && (
                    <Tooltip title="恢复到此版本">
                      <IconButton
                        size="small"
                        onClick={() => onRestoreVersion(operation.id)}
                        color="primary"
                      >
                        <Restore />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>

      {operations.length > maxDisplayItems && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button
            startIcon={expanded ? <ExpandLess /> : <ExpandMore />}
            onClick={() => setExpanded(!expanded)}
            size="small"
          >
            {expanded ? '收起' : `显示全部 ${operations.length} 个版本`}
          </Button>
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          版本预览
          {previewDialog.operation && (
            <Typography variant="subtitle2" color="text.secondary">
              {formatTimestamp(previewDialog.operation.timestamp)} • {getSourceChip(previewDialog.operation.source)}
            </Typography>
          )}
        </DialogTitle>
        
        <DialogContent>
          {previewDialog.operation && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                操作类型: {previewDialog.operation.type}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                内容:
              </Typography>
              
              <TextField
                multiline
                fullWidth
                value={previewDialog.operation.content}
                InputProps={{
                  readOnly: true,
                }}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '14px',
                    lineHeight: 1.6,
                  },
                }}
                minRows={4}
                maxRows={12}
              />

              {showDetails && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    操作ID: {previewDialog.operation.id}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="text.secondary">
                    位置: {previewDialog.operation.position}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClosePreview}>
            关闭
          </Button>
          {previewDialog.operation && !isCurrentVersion(
            operations.findIndex(op => op.id === previewDialog.operation!.id)
          ) && (
            <Button
              variant="contained"
              onClick={() => {
                onRestoreVersion(previewDialog.operation!.id);
                handleClosePreview();
              }}
            >
              恢复到此版本
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Paper>
  );
}