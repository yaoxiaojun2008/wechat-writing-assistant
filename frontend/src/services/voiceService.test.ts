import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceRecordingService, WebSpeechService } from './voiceService';

// Mock MediaRecorder
global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  requestData: vi.fn(),
  stream: new MediaStream(),
  mimeType: 'audio/webm',
  state: 'inactive',
  ondataavailable: vi.fn(),
  onerror: vi.fn(),
  onpause: vi.fn(),
  onresume: vi.fn(),
  onstart: vi.fn(),
  onstop: vi.fn(),
} as any)).mockImplementation((stream: MediaStream) => {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    requestData: vi.fn(),
    stream,
    mimeType: 'audio/webm',
    state: 'inactive',
    ondataavailable: vi.fn(),
    onerror: vi.fn(),
    onpause: vi.fn(),
    onresume: vi.fn(),
    onstart: vi.fn(),
    onstop: vi.fn(),
  } as any;
}).mockImplementation(() => {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    requestData: vi.fn(),
    stream: new MediaStream(),
    mimeType: 'audio/webm',
    state: 'inactive',
    ondataavailable: vi.fn(),
    onerror: vi.fn(),
    onpause: vi.fn(),
    onresume: vi.fn(),
    onstart: vi.fn(),
    onstop: vi.fn(),
  } as any;
}).mockImplementation(() => {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    requestData: vi.fn(),
    stream: new MediaStream(),
    mimeType: 'audio/webm',
    state: 'inactive',
    ondataavailable: vi.fn(),
    onerror: vi.fn(),
    onpause: vi.fn(),
    onresume: vi.fn(),
    onstart: vi.fn(),
    onstop: vi.fn(),
  } as any;
}) as any;

// Add isTypeSupported method to mock
(global.MediaRecorder as any).isTypeSupported = vi.fn().mockReturnValue(true);

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
    // Create mock stream and track
    const mockTrack = {
      stop: vi.fn(),
    } as any as MediaStreamTrack; // 强制转换类型以解决类型不匹配问题
    const mockStream = { getTracks: () => [mockTrack] };
    
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
    
    // Access the MediaRecorder instance from the service
    // @ts-ignore - accessing private property for testing
    const recorderInstance = voiceService['mediaRecorder'];
    expect(recorderInstance).toBeDefined();
    if (recorderInstance) {
      expect(recorderInstance.start).toHaveBeenCalledWith(1000);
    }
    expect(voiceService.getRecordingState()).toBe(true);
  });

  it('should handle getUserMedia errors', async () => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(error);

    await expect(voiceService.startRecording()).rejects.toThrow('请允许访问麦克风以使用语音录制功能');
  });

  it('should handle recorder stop event', async () => {
    // Create mock stream and track
    const mockTrack = {
      stop: vi.fn(),
    } as any as MediaStreamTrack; // 强制转换类型以解决类型不匹配问题
    const mockStream = { getTracks: () => [mockTrack] };
    const mockBlob = new Blob(['test'], { type: 'audio/webm' });
    
    // Mock getUserMedia
    (navigator.mediaDevices.getUserMedia as any).mockResolvedValue(mockStream);
    
    // Start recording
    const recordingPromise = voiceService.startRecording();

    // Access the MediaRecorder instance from the service
    // @ts-ignore - accessing private property for testing
    const recorderInstance = voiceService['mediaRecorder'];
    expect(recorderInstance).toBeDefined();

    // Manually trigger the dataavailable event
    if (recorderInstance && recorderInstance.ondataavailable) {
      const dataEvent = { data: mockBlob } as unknown as BlobEvent;
      recorderInstance.ondataavailable(dataEvent);
    }

    // Simulate the stop event by calling the onstop handler
    if (recorderInstance && recorderInstance.onstop) {
      recorderInstance.onstop(new Event('stop'));
    }

    // Wait for the recording to complete
    const audioBuffer = await recordingPromise;

    // Verify the recording process
    expect(audioBuffer).toBeInstanceOf(ArrayBuffer);
  });

  it('should stop recording and return audio blob', async () => {
    // Create mock stream and track
    const mockTrack = {
      stop: vi.fn(),
    } as any as MediaStreamTrack; // 强制转换类型以解决类型不匹配问题
    const mockStream = { getTracks: () => [mockTrack] };
    const mockBlob = new Blob(['test'], { type: 'audio/webm' });
    
    // Mock getUserMedia
    (navigator.mediaDevices.getUserMedia as any).mockResolvedValue(mockStream);
    
    // Start recording
    await voiceService.startRecording();

    // Access the MediaRecorder instance from the service
    // @ts-ignore - accessing private property for testing
    const recorderInstance = voiceService['mediaRecorder'];
    
    // Set up the ondataavailable event to provide our mock blob
    if (recorderInstance && recorderInstance.ondataavailable) {
      const dataEvent = { data: mockBlob } as unknown as BlobEvent;
      recorderInstance.ondataavailable(dataEvent);
    }

    // Stop recording
    const stopPromise = voiceService.stopRecording();
    
    // Simulate the onstop event
    if (recorderInstance && recorderInstance.onstop) {
      recorderInstance.onstop(new Event('stop'));
    }

    const audioBlob = await stopPromise;
    expect(audioBlob).toBeDefined();
    expect(voiceService.getRecordingState()).toBe(false);
  });

  it('should cancel recording', async () => {
    // Create mock track with stop method
    const mockTrack = {
      stop: vi.fn(),
    } as any as MediaStreamTrack; // 强制转换类型以解决类型不匹配问题
    const mockStream = { getTracks: () => [mockTrack] };
    
    // Mock getUserMedia
    (navigator.mediaDevices.getUserMedia as any).mockResolvedValue(mockStream);
    
    // Start recording
    await voiceService.startRecording();

    // Cancel recording
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