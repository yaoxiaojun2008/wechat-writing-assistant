import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MainWorkspace } from './MainWorkspace';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock the voice service
vi.mock('@/services/voiceService', () => ({
  voiceRecordingService: {
    startRecording: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn().mockResolvedValue(new Blob()),
    transcribeAudio: vi.fn().mockResolvedValue({
      transcribedText: '这是模拟的语音转文字结果。',
      timestamp: new Date().toISOString(),
    }),
    getRecordingState: vi.fn().mockReturnValue(false),
    cancelRecording: vi.fn(),
  },
  webSpeechService: {
    isSupported: vi.fn().mockReturnValue(true),
    startListening: vi.fn().mockResolvedValue('这是模拟的语音转文字结果。'),
  },
}));

// Mock the auth context
const mockUser = {
  id: 'test-user-id',
  passwordHash: 'hashed-password',
  wechatConfig: {
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
  },
  preferences: {
    defaultPublishTime: '09:00',
    autoSave: true,
    voiceLanguage: 'zh-CN' as const,
    aiEditingLevel: 'moderate' as const,
  },
  createdAt: new Date(),
  lastLoginAt: new Date(),
};

const mockAuthContext = {
  user: mockUser,
  isAuthenticated: true,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

// Mock the useAuth hook
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('MainWorkspace Component', () => {
  it('should render dual dialog box layout', () => {
    render(
      <AuthProvider>
        <MainWorkspace />
      </AuthProvider>
    );

    // Check for main title
    expect(screen.getByText('微信公众号写作助手')).toBeInTheDocument();
    
    // Check for workspace toolbar
    expect(screen.getByText('写作工作台')).toBeInTheDocument();
    
    // Check for voice input panel
    expect(screen.getByText('语音输入')).toBeInTheDocument();
    expect(screen.getByText('点击录音按钮开始语音输入...')).toBeInTheDocument();
    
    // Check for editing panel
    expect(screen.getByText('AI编辑内容')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('AI编辑后的内容将显示在这里，您可以进一步修改...')).toBeInTheDocument();
  });

  it('should display toolbar buttons', () => {
    render(
      <AuthProvider>
        <MainWorkspace />
      </AuthProvider>
    );

    // Check for toolbar buttons
    expect(screen.getByText('草稿管理')).toBeInTheDocument();
    expect(screen.getByText('定时发布')).toBeInTheDocument();
  });

  it('should handle voice recording toggle', async () => {
    render(
      <AuthProvider>
        <MainWorkspace />
      </AuthProvider>
    );

    const recordButton = screen.getByRole('button', { name: /开始录音|停止录音/i });
    
    // Click to start recording
    fireEvent.click(recordButton);
    
    // Should show recording status
    await waitFor(() => {
      expect(screen.getByText('录音中... 再次点击停止')).toBeInTheDocument();
    });
  });

  it('should clear text when clear button is clicked', async () => {
    render(
      <AuthProvider>
        <MainWorkspace />
      </AuthProvider>
    );

    // First simulate some transcribed text by recording
    const recordButton = screen.getByRole('button', { name: /开始录音|停止录音/i });
    fireEvent.click(recordButton);
    fireEvent.click(recordButton); // Stop recording

    // Wait for mock transcription
    await waitFor(() => {
      expect(screen.getByText('这是模拟的语音转文字结果。')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click clear button
    const clearButton = screen.getByText('清空');
    fireEvent.click(clearButton);

    // Text should be cleared
    expect(screen.queryByText('这是模拟的语音转文字结果。')).not.toBeInTheDocument();
  });

  it('should show user information', () => {
    render(
      <AuthProvider>
        <MainWorkspace />
      </AuthProvider>
    );

    // Check user info display
    expect(screen.getByText(`用户ID: ${mockUser.id}`)).toBeInTheDocument();
    expect(screen.getByText('语音语言: zh-CN | AI编辑级别: moderate')).toBeInTheDocument();
  });

  it('should handle logout', async () => {
    render(
      <AuthProvider>
        <MainWorkspace />
      </AuthProvider>
    );

    // Click user menu
    const userMenuButton = screen.getByLabelText('account of current user');
    fireEvent.click(userMenuButton);

    // Click logout
    const logoutButton = screen.getByText('退出登录');
    fireEvent.click(logoutButton);

    // Should call logout function
    expect(mockAuthContext.logout).toHaveBeenCalled();
  });
});