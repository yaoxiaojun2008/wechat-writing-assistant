import {
  Box,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import {
  Refresh,
  DraftsOutlined,
  Schedule,
  Settings,
  Help,
  Notifications,
} from '@mui/icons-material';

interface WorkspaceToolbarProps {
  onRefresh?: () => void;
  onOpenDrafts?: () => void;
  onOpenScheduler?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  hasNotifications?: boolean;
  isProcessing?: boolean;
}

export function WorkspaceToolbar({
  onRefresh,
  onOpenDrafts,
  onOpenScheduler,
  onOpenSettings,
  onOpenHelp,
  hasNotifications = false,
  isProcessing = false,
}: WorkspaceToolbarProps) {
  return (
    <Box
      sx={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        mb: 3,
      }}
    >
      <Toolbar sx={{ minHeight: '56px !important', px: 0 }}>
        {/* Left Section - Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <Typography variant="h6" sx={{ mr: 2 }}>
            写作工作台
          </Typography>
          
          {isProcessing && (
            <Chip
              label="处理中"
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        {/* Right Section - Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Refresh */}
          <IconButton
            onClick={onRefresh}
            disabled={isProcessing}
            title="刷新"
            size="small"
          >
            <Refresh />
          </IconButton>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* Draft Management */}
          <Button
            startIcon={<DraftsOutlined />}
            onClick={onOpenDrafts}
            size="small"
            variant="outlined"
          >
            草稿管理
          </Button>

          {/* Scheduler */}
          <Button
            startIcon={<Schedule />}
            onClick={onOpenScheduler}
            size="small"
            variant="outlined"
          >
            定时发布
          </Button>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* Notifications */}
          <IconButton
            size="small"
            title="通知"
            color={hasNotifications ? 'primary' : 'default'}
          >
            <Notifications />
          </IconButton>

          {/* Settings */}
          <IconButton
            onClick={onOpenSettings}
            size="small"
            title="设置"
          >
            <Settings />
          </IconButton>

          {/* Help */}
          <IconButton
            onClick={onOpenHelp}
            size="small"
            title="帮助"
          >
            <Help />
          </IconButton>
        </Box>
      </Toolbar>
    </Box>
  );
}