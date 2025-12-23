import { VoiceService, VoiceSession } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { SpeechClient } from '@google-cloud/speech';

export class VoiceServiceImpl implements VoiceService {
  private readonly uploadDir = 'uploads/audio';
  private readonly supportedFormats = ['audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4'];
  private readonly openai: OpenAI | null = null;
  private readonly speechClient: SpeechClient | null = null;
  private readonly useRealAPI: boolean;
  private readonly speechProvider: string;

  constructor() {
    this.ensureUploadDirectory();
    
    // Get configuration
    const useRealAPI = process.env.USE_REAL_SPEECH_API === 'true';
    this.speechProvider = process.env.SPEECH_API_PROVIDER || 'mock';
    this.useRealAPI = useRealAPI;
    
    if (this.useRealAPI) {
      if (this.speechProvider === 'google') {
        this.initializeGoogleSpeech();
      } else if (this.speechProvider === 'openai') {
        this.initializeOpenAISpeech();
      }
    } else {
      logger.info('Using mock speech-to-text service (set USE_REAL_SPEECH_API=true to enable real API)');
    }
  }

  private initializeGoogleSpeech(): void {
    try {
      // Initialize Google Speech client
      const clientConfig: any = {};
      
      // Use API key if provided, otherwise fall back to service account
      if (process.env.GOOGLE_API_KEY) {
        clientConfig.apiKey = process.env.GOOGLE_API_KEY;
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        clientConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
      
      if (process.env.GOOGLE_PROJECT_ID) {
        clientConfig.projectId = process.env.GOOGLE_PROJECT_ID;
      }

      (this as any).speechClient = new SpeechClient(clientConfig);
      logger.info('Google Cloud Speech API initialized for speech-to-text');
    } catch (error) {
      logger.error('Failed to initialize Google Speech client:', error);
      logger.info('Falling back to mock speech service');
    }
  }

  private initializeOpenAISpeech(): void {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && apiKey !== 'your-openai-api-key-here') {
        (this as any).openai = new OpenAI({ apiKey });
        logger.info('OpenAI Whisper API initialized for speech-to-text');
      } else {
        throw new Error('OpenAI API key not configured');
      }
    } catch (error) {
      logger.error('Failed to initialize OpenAI client:', error);
      logger.info('Falling back to mock speech service');
    }
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directory:', error);
    }
  }

  validateAudioFormat(file: Express.Multer.File): boolean {
    if (!file) {
      return false;
    }

    // Check MIME type
    if (!this.supportedFormats.includes(file.mimetype)) {
      logger.warn(`Unsupported audio format: ${file.mimetype}`);
      return false;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      logger.warn(`Audio file too large: ${file.size} bytes`);
      return false;
    }

    return true;
  }

  async transcribeAudio(audioBuffer: Buffer, userId: string): Promise<string> {
    try {
      logger.info(`Starting audio transcription for user: ${userId}, buffer size: ${audioBuffer.length} bytes, provider: ${this.speechProvider}`);
      
      // Save audio file temporarily
      const sessionId = uuidv4();
      const audioPath = path.join(this.uploadDir, userId, `${sessionId}.wav`);
      
      // Ensure user directory exists
      await fs.mkdir(path.dirname(audioPath), { recursive: true });
      await fs.writeFile(audioPath, audioBuffer);

      let transcribedText: string;

      if (this.useRealAPI) {
        if (this.speechProvider === 'google' && this.speechClient) {
          // Use Google Speech-to-Text API
          transcribedText = await this.transcribeWithGoogle(audioBuffer);
        } else if (this.speechProvider === 'openai' && this.openai) {
          // Use OpenAI Whisper API
          transcribedText = await this.transcribeWithWhisper(audioPath);
        } else {
          // Fallback to mock if no valid provider
          transcribedText = await this.mockTranscription(audioBuffer);
        }
      } else {
        // Use mock transcription for development
        transcribedText = await this.mockTranscription(audioBuffer);
      }
      
      // Clean up temporary file
      try {
        await fs.unlink(audioPath);
      } catch (error) {
        logger.warn(`Failed to clean up audio file: ${audioPath}`, error);
      }

      logger.info(`Audio transcription completed for user: ${userId}, result length: ${transcribedText.length} chars`);
      return transcribedText;
    } catch (error) {
      logger.error('Audio transcription failed:', error);
      throw new Error('语音转文字处理失败，请重试');
    }
  }

  private async transcribeWithGoogle(audioBuffer: Buffer): Promise<string> {
    try {
      if (!this.speechClient) {
        throw new Error('Google Speech client not initialized');
      }

      logger.info('Transcribing audio with Google Cloud Speech API');
      
      // Configure the request
      const request = {
        audio: {
          content: audioBuffer.toString('base64'),
        },
        config: {
          encoding: 'WEBM_OPUS' as const, // Adjust based on your audio format
          sampleRateHertz: 48000, // Adjust based on your audio
          languageCode: 'zh-CN', // Chinese (Simplified)
          alternativeLanguageCodes: ['zh-TW', 'zh'], // Chinese variants
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: false,
          model: 'latest_long', // Use latest model for better accuracy
        },
      };

      // Perform the speech recognition request
      const [response] = await this.speechClient.recognize(request);
      
      if (!response.results || response.results.length === 0) {
        logger.warn('No speech recognition results from Google API');
        return '未检测到语音内容';
      }

      // Extract transcription from results
      const transcription = response.results
        .map(result => result.alternatives?.[0]?.transcript || '')
        .join(' ')
        .trim();

      if (!transcription) {
        logger.warn('Empty transcription from Google API');
        return '语音识别未返回内容';
      }

      logger.info(`Google Speech transcription completed, result: ${transcription.substring(0, 100)}...`);
      return transcription;
    } catch (error) {
      logger.error('Google Speech transcription failed:', error);
      
      // Fallback to mock if API fails
      logger.warn('Falling back to mock transcription due to Google API error');
      const audioBuffer = Buffer.from('fallback');
      return await this.mockTranscription(audioBuffer);
    }
  }

  private async transcribeWithWhisper(audioPath: string): Promise<string> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      logger.info(`Transcribing audio with OpenAI Whisper: ${audioPath}`);
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: createReadStream(audioPath),
        model: 'whisper-1',
        language: 'zh', // Chinese language
        response_format: 'text',
      });

      // The result should be a string when response_format is 'text'
      const result = typeof transcription === 'string' ? transcription : String(transcription);
      logger.info(`Whisper transcription completed, result: ${result.substring(0, 100)}...`);
      
      return result.trim();
    } catch (error) {
      logger.error('OpenAI Whisper transcription failed:', error);
      
      // Fallback to mock if API fails
      logger.warn('Falling back to mock transcription due to API error');
      const audioBuffer = await fs.readFile(audioPath);
      return await this.mockTranscription(audioBuffer);
    }
  }

  private async mockTranscription(audioBuffer: Buffer): Promise<string> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Mock transcription based on audio buffer size
    const sizeKB = audioBuffer.length / 1024;
    
    logger.info(`Mock transcription for audio size: ${sizeKB.toFixed(2)}KB, provider: ${this.speechProvider}`);
    
    const providerName = this.speechProvider === 'google' ? 'Google Speech' : 
                        this.speechProvider === 'openai' ? 'OpenAI Whisper' : 
                        '通用语音识别';
    
    if (sizeKB < 10) {
      return `[模拟转录 - ${providerName}] 这是一段简短的语音测试内容。`;
    } else if (sizeKB < 50) {
      return `[模拟转录 - ${providerName}] 这是一段中等长度的语音内容，包含了一些关于微信公众号写作的想法和建议。`;
    } else {
      return `[模拟转录 - ${providerName}] 这是一段较长的语音内容，讨论了关于内容创作、用户互动以及如何提高文章质量的多个方面。

注意：当前使用的是模拟语音转录服务。要获得真实的语音转录功能，请配置 ${providerName} API 密钥并设置生产环境。

内容创作需要考虑读者的需求和兴趣点，同时保持原创性和价值输出。在微信公众号平台上，好的内容不仅要有深度，还要有温度，能够与读者产生共鸣。`;
    }
  }

  async createVoiceSession(userId: string): Promise<VoiceSession> {
    const session: VoiceSession = {
      id: uuidv4(),
      userId,
      audioFile: '',
      transcribedText: '',
      status: 'recording',
      createdAt: new Date(),
    };

    logger.info(`Created voice session: ${session.id} for user: ${userId}`);
    return session;
  }

  async updateVoiceSession(sessionId: string, updates: Partial<VoiceSession>): Promise<VoiceSession> {
    // In a real implementation, this would update the session in the database
    // For now, we'll just return a mock updated session
    const session: VoiceSession = {
      id: sessionId,
      userId: updates.userId || '',
      audioFile: updates.audioFile || '',
      transcribedText: updates.transcribedText || '',
      status: updates.status || 'completed',
      createdAt: updates.createdAt || new Date(),
      completedAt: updates.completedAt || new Date(),
    };

    logger.info(`Updated voice session: ${sessionId}`);
    return session;
  }
}

export const voiceService = new VoiceServiceImpl();