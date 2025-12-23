import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceRecordingService, WebSpeechService } from './voiceService';

// Mock MediaRecorder
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null,
  onerror: null,
  onstop: null,
  state: 'inactive',
};

const mockTrack = { stop: vi.fn() };
const mockStream = {
  getTracks: vi.fn(() => [mockTrack]),
};

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(),
  },
});

// Mock MediaRecorder constructor
global.MediaRecorder = vi.fn(() => mockMediaRecorder) as any;
global.MediaRecorder.isTypeSupported = vi.fn(() => true);

// Mock Blob constructor
global.Blob = vi.fn(() => ({
  size: 1024,
  type: 'audio/webm',
})) as any;

describe('VoiceRecordingService', () => {
  let voiceService: VoiceRecordingService;

  beforeEach(() => {
    voiceService = new VoiceRecordingService();
    vi.clearAllMocks();
  });

  it('should initialize correctly', () => {
    expect(voiceService).toBeDefined();
    expect(voiceService.getRecordingState()).toBe(false);
  });

  it('should start recording successfully', async () => {
    // Mock successful getUserMedia
    (navigator.mediaDevices.getUserMedia as any).mockResolvedValue(mockStream);

    await voiceService.startRecording();

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        sampleRate: 44100,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    expect(mockMediaRecorder.start).toHaveBeenCalledWith(1000);
    expect(voiceService.getRecordingState()).toBe(true);
  });

  it('should handle getUserMedia errors', async () => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(error);

    await expect(voiceService.startRecording()).rejects.toThrow('请允许访问麦克风以使用语音录制功能');
  });

  it('should stop recording and return audio blob', async () => {
    // First start recording
    (navigator.mediaDevices.getUserMedia as any).mockResolvedValue(mockStream);
    await voiceService.startRecording();

    // Mock the stop behavior
    const stopPromise = voiceService.stopRecording();
    
    // Simulate the onstop event
    if (mockMediaRecorder.onstop) {
      mockMediaRecorder.onstop();
    }

    const audioBlob = await stopPromise;
    expect(audioBlob).toBeDefined();
    expect(voiceService.getRecordingState()).toBe(false);
  });

  it('should cancel recording', async () => {
    (navigator.mediaDevices.getUserMedia as any).mockResolvedValue(mockStream);
    await voiceService.startRecording();

    voiceService.cancelRecording();

    expect(voiceService.getRecordingState()).toBe(false);
    expect(mockTrack.stop).toHaveBeenCalled();
  });
});

describe('WebSpeechService', () => {
  let speechService: WebSpeechService;

  beforeEach(() => {
    speechService = new WebSpeechService();
  });

  it('should initialize correctly', () => {
    expect(speechService).toBeDefined();
    expect(speechService.getListeningState()).toBe(false);
  });

  it('should detect if speech recognition is supported', () => {
    // This will depend on the test environment
    const isSupported = speechService.isSupported();
    expect(typeof isSupported).toBe('boolean');
  });
});