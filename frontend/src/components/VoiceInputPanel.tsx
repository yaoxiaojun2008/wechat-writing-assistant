import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Mic,
  MicOff,
  Clear,
  VolumeUp,
  Settings,
  AutoAwesome,
} from '@mui/icons-material';

interface VoiceInputPanelProps {
  transcribedText: string;
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<void>;
  onClearText: () => void;
  onTestMicrophone?: () => Promise<{
    hasPermission: boolean;
    canRecord: boolean;
    message: string;
  }>;
  onSendToLLM?: (text: string) => Promise<void>;
  isLLMProcessing?: boolean;
}

export function VoiceInputPanel({
  transcribedText,
  isRecording,
  isProcessing,
  error,
  onStartRecording,
  onStopRecording,
  onClearText,
  onTestMicrophone,
  onSendToLLM,
  isLLMProcessing = false,
}: VoiceInputPanelProps) {
  const handleRecordingToggle = async () => {
    try {
      if (isRecording) {
        await onStopRecording();
      } else {
        await onStartRecording();
      }
    } catch (error) {
      console.error('Recording toggle error:', error);
    }
  };

  const handleTestMicrophone = async () => {
    if (!onTestMicrophone) return;
    
    try {
      const result = await onTestMicrophone();
      alert(result.message); // Simple alert for now, could be improved with a proper dialog
    } catch (error) {
      console.error('Microphone test error:', error);
      alert('麦克风测试失败，请检查浏览器控制台获取详细信息');
    }
  };

  const handleSendToLLM = async () => {
    if (!onSendToLLM || !transcribedText.trim()) return;
    
    try {
      await onSendToLLM(transcribedText);
    } catch (error) {
      console.error('Send to LLM error:', error);
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        height: '300px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8f9fa',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <VolumeUp sx={{ mr: 1 }} />
          语音输入
        </Typography>
        <Box>
          {onTestMicrophone && (
            <Button
              size="small"
              startIcon={<Settings />}
              onClick={handleTestMicrophone}
              disabled={isRecording || isProcessing}
              sx={{ mr: 1 }}
            >
              测试麦克风
            </Button>
          )}
          {transcribedText && onSendToLLM && (
            <Button
              size="small"
              startIcon={isLLMProcessing ? <CircularProgress size={16} /> : <AutoAwesome />}
              onClick={handleSendToLLM}
              disabled={isRecording || isProcessing || isLLMProcessing || !transcribedText.trim()}
              sx={{ mr: 1 }}
              variant="contained"
              color="primary"
            >
              {isLLMProcessing ? '处理中...' : '发给LLM'}
            </Button>
          )}
          {transcribedText && (
            <Button
              size="small"
              startIcon={<Clear />}
              onClick={onClearText}
              disabled={isRecording || isProcessing}
            >
              清空
            </Button>
          )}
        </Box>
      </Box>

      {/* Content Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Text Display Area */}
        <Box
          sx={{
            flex: 1,
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            p: 2,
            mb: 2,
            backgroundColor: 'white',
            overflow: 'auto',
            minHeight: '120px',
          }}
        >
          {transcribedText ? (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {transcribedText}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              点击录音按钮开始语音输入...
            </Typography>
          )}
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Recording Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <IconButton
            onClick={handleRecordingToggle}
            disabled={isProcessing}
            aria-label={isRecording ? '停止录音' : '开始录音'}
            title={isRecording ? '停止录音' : '开始录音'}
            sx={{
              width: 64,
              height: 64,
              backgroundColor: isRecording ? '#f44336' : '#2196f3',
              color: 'white',
              '&:hover': {
                backgroundColor: isRecording ? '#d32f2f' : '#1976d2',
              },
              '&:disabled': {
                backgroundColor: '#bdbdbd',
              },
            }}
          >
            {isProcessing ? (
              <CircularProgress size={24} color="inherit" />
            ) : isRecording ? (
              <MicOff />
            ) : (
              <Mic />
            )}
          </IconButton>
        </Box>

        {/* Status Text */}
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {isProcessing
              ? '正在处理语音...'
              : isRecording
              ? '录音中... 再次点击停止'
              : '点击开始录音'}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}