import axios from 'axios';
import { ApiResponse } from '../types';

export interface VoiceRecordingOptions {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
}

export interface TranscriptionResult {
  transcribedText: string;
  timestamp: string;
}

export class VoiceRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording = false;

  private readonly defaultOptions: VoiceRecordingOptions = {
    sampleRate: 44100,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
  };

  async startRecording(options?: VoiceRecordingOptions): Promise<void> {
    if (this.isRecording) {
      throw new Error('录音已在进行中');
    }

    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持语音录制功能');
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          ...this.defaultOptions,
          ...options,
        },
      };

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Initialize MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
      });

      // Reset audio chunks
      this.audioChunks = [];

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.cleanup();
        throw new Error('录音过程中发生错误');
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;

    } catch (error) {
      this.cleanup();
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('请允许访问麦克风以使用语音录制功能');
        } else if (error.name === 'NotFoundError') {
          throw new Error('未找到可用的麦克风设备');
        } else if (error.name === 'NotSupportedError') {
          throw new Error('您的浏览器不支持语音录制功能');
        }
        throw error;
      }
      throw new Error('启动录音失败');
    }
  }

  async stopRecording(): Promise<Blob> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('当前没有进行录音');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder 未初始化'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const mimeType = this.getSupportedMimeType();
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          this.cleanup();
          resolve(audioBlob);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      // Get session token from localStorage
      const sessionId = localStorage.getItem('sessionId');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await axios.post<ApiResponse<TranscriptionResult>>(
        `${API_BASE_URL}/voice/transcribe`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': sessionId ? `Bearer ${sessionId}` : '',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || '语音转文字失败');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('语音处理超时，请重试');
        } else if (error.response?.status === 413) {
          throw new Error('音频文件过大，请录制较短的语音');
        } else if (error.response?.status === 401) {
          throw new Error('认证失败，请重新登录');
        } else if (error.response?.data?.error?.message) {
          throw new Error(error.response.data.error.message);
        }
      }
      throw new Error('语音转文字处理失败，请重试');
    }
  }

  cancelRecording(): void {
    if (this.isRecording && this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
    this.cleanup();
  }

  getRecordingState(): boolean {
    return this.isRecording;
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    // Fallback to basic webm if nothing else is supported
    return 'audio/webm';
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }
}

// Web Speech API service (alternative/fallback)
export class WebSpeechService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;

  constructor() {
    // Check for Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
      console.log('Web Speech API initialized successfully');
    } else {
      console.warn('Web Speech API not supported in this browser');
    }
  }

  private setupRecognition(): void {
    if (!this.recognition) return;

    // Configure for better Chinese speech recognition
    this.recognition.continuous = true; // Enable continuous recognition for longer speech
    this.recognition.interimResults = true;
    this.recognition.lang = 'zh-CN';
    this.recognition.maxAlternatives = 1;
    
    // Additional settings for better performance
    if ('webkitSpeechRecognition' in window) {
      // Chrome-specific optimizations
      (this.recognition as any).serviceURI = 'wss://www.google.com/speech-api/full-duplex/v1/up';
    }
    
    console.log('Web Speech API configured for Chinese (zh-CN) with continuous recognition');
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  async startListening(): Promise<string> {
    if (!this.recognition) {
      throw new Error('您的浏览器不支持语音识别功能');
    }

    if (this.isListening) {
      throw new Error('语音识别已在进行中');
    }

    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('语音识别未初始化'));
        return;
      }

      let finalTranscript = '';
      let interimTranscript = '';
      let timeoutId: NodeJS.Timeout | null = null;
      let hasReceivedSpeech = false;

      this.recognition.onstart = () => {
        this.isListening = true;
        console.log('🎤 Web Speech API started listening');
        console.log('Configuration:', {
          continuous: this.recognition?.continuous,
          interimResults: this.recognition?.interimResults,
          lang: this.recognition?.lang,
          maxAlternatives: this.recognition?.maxAlternatives
        });
      };

      this.recognition.onresult = (event) => {
        hasReceivedSpeech = true;
        interimTranscript = '';
        
        console.log('📝 Speech recognition result event:', {
          resultIndex: event.resultIndex,
          resultsLength: event.results.length
        });
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            console.log('✅ Final transcript added:', transcript, 'confidence:', confidence);
            console.log('📄 Total final transcript so far:', finalTranscript);
          } else {
            interimTranscript += transcript;
            console.log('⏳ Interim transcript:', transcript, 'confidence:', confidence);
          }
        }

        // Reset timeout when we receive speech
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        // Set a longer timeout for silence detection (8 seconds of silence)
        // This allows for natural pauses in speech
        timeoutId = setTimeout(() => {
          console.log('🔇 Extended silence detected, stopping recognition');
          console.log('📋 Final result before stopping:', finalTranscript);
          this.stopListening();
        }, 8000); // Increased from 5 to 8 seconds
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Combine final and interim results
        const result = (finalTranscript + interimTranscript).trim();
        console.log('🏁 Recognition ended');
        console.log('📄 Final transcript:', finalTranscript);
        console.log('⏳ Interim transcript:', interimTranscript);
        console.log('🎯 Combined result:', result);
        console.log('📊 Result length:', result.length, 'characters');
        
        if (!result && !hasReceivedSpeech) {
          reject(new Error('未检测到语音，请重试'));
        } else if (!result && hasReceivedSpeech) {
          // If we received speech but no final result, return a message
          resolve('语音识别完成，但未能获取完整结果，请重试');
        } else {
          resolve(result);
        }
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        console.error('Speech recognition error:', event.error);
        
        let errorMessage = '语音识别失败';
        switch (event.error) {
          case 'not-allowed':
            errorMessage = '请允许访问麦克风以使用语音识别功能';
            break;
          case 'no-speech':
            errorMessage = '未检测到语音，请重试';
            break;
          case 'network':
            errorMessage = '网络错误，请检查网络连接';
            break;
          case 'audio-capture':
            errorMessage = '音频捕获失败，请检查麦克风';
            break;
          case 'aborted':
            // Don't treat manual abort as an error
            if (hasReceivedSpeech) {
              resolve(finalTranscript.trim());
              return;
            }
            errorMessage = '语音识别已取消';
            break;
        }
        
        reject(new Error(errorMessage));
      };

      try {
        this.recognition.start();
      } catch (error) {
        this.isListening = false;
        reject(error);
      }
    });
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  getListeningState(): boolean {
    return this.isListening;
  }

  // Test microphone access and functionality
  async testMicrophone(): Promise<{
    hasPermission: boolean;
    canRecord: boolean;
    message: string;
  }> {
    try {
      // Test 1: Check if Web Speech API is supported
      if (!this.recognition) {
        return {
          hasPermission: false,
          canRecord: false,
          message: '您的浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器'
        };
      }

      // Test 2: Check microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Test 3: Quick speech recognition test
      return new Promise((resolve) => {
        if (!this.recognition) {
          resolve({
            hasPermission: true,
            canRecord: false,
            message: '语音识别服务未初始化'
          });
          return;
        }

        let testCompleted = false;
        const testTimeout = setTimeout(() => {
          if (!testCompleted) {
            testCompleted = true;
            this.recognition?.stop();
            resolve({
              hasPermission: true,
              canRecord: true,
              message: '麦克风测试成功！您可以开始使用语音输入功能。'
            });
          }
        }, 3000); // 3 second test

        this.recognition.onstart = () => {
          console.log('Microphone test: Speech recognition started');
        };

        this.recognition.onresult = (event) => {
          if (!testCompleted) {
            testCompleted = true;
            clearTimeout(testTimeout);
            this.recognition?.stop();
            
            // Clean up the stream
            stream.getTracks().forEach(track => track.stop());
            
            resolve({
              hasPermission: true,
              canRecord: true,
              message: '麦克风测试成功！检测到语音输入，系统工作正常。'
            });
          }
        };

        this.recognition.onerror = (event) => {
          if (!testCompleted) {
            testCompleted = true;
            clearTimeout(testTimeout);
            
            // Clean up the stream
            stream.getTracks().forEach(track => track.stop());
            
            let message = '麦克风测试失败：';
            switch (event.error) {
              case 'not-allowed':
                message += '请允许访问麦克风权限';
                break;
              case 'no-speech':
                message += '未检测到语音，但麦克风权限正常';
                break;
              case 'audio-capture':
                message += '音频捕获失败，请检查麦克风设备';
                break;
              case 'network':
                message += '网络连接问题';
                break;
              default:
                message += event.error;
            }
            
            resolve({
              hasPermission: true,
              canRecord: event.error !== 'not-allowed' && event.error !== 'audio-capture',
              message
            });
          }
        };

        this.recognition.onend = () => {
          if (!testCompleted) {
            testCompleted = true;
            clearTimeout(testTimeout);
            
            // Clean up the stream
            stream.getTracks().forEach(track => track.stop());
            
            resolve({
              hasPermission: true,
              canRecord: true,
              message: '麦克风测试完成！未检测到语音，但设备工作正常。'
            });
          }
        };

        try {
          this.recognition.start();
        } catch (error) {
          testCompleted = true;
          clearTimeout(testTimeout);
          
          // Clean up the stream
          stream.getTracks().forEach(track => track.stop());
          
          resolve({
            hasPermission: true,
            canRecord: false,
            message: `语音识别启动失败: ${error instanceof Error ? error.message : '未知错误'}`
          });
        }
      });

    } catch (error) {
      console.error('Microphone test error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          return {
            hasPermission: false,
            canRecord: false,
            message: '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风'
          };
        } else if (error.name === 'NotFoundError') {
          return {
            hasPermission: false,
            canRecord: false,
            message: '未找到麦克风设备，请检查麦克风是否正确连接'
          };
        } else if (error.name === 'NotSupportedError') {
          return {
            hasPermission: false,
            canRecord: false,
            message: '您的浏览器不支持麦克风访问功能'
          };
        }
      }
      
      return {
        hasPermission: false,
        canRecord: false,
        message: `麦克风测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }
}

// Export singleton instances
export const voiceRecordingService = new VoiceRecordingService();
export const webSpeechService = new WebSpeechService();