// Core data types based on design document

export interface User {
  id: string;
  passwordHash: string;
  wechatConfig: WeChatConfig;
  preferences: UserPreferences;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface WeChatConfig {
  appId: string;
  appSecret: string;
  accessToken?: string;
  tokenExpiresAt?: Date;
  defaultThumbMediaId?: string;
}

export interface UserPreferences {
  defaultPublishTime: string; // HH:mm format
  autoSave: boolean;
  voiceLanguage: 'zh-CN' | 'en-US';
  aiEditingLevel: 'light' | 'moderate' | 'heavy';
}

export interface VoiceSession {
  id: string;
  userId: string;
  audioFile: string;
  transcribedText: string;
  status: 'recording' | 'transcribing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface EditingSession {
  id: string;
  userId: string;
  originalText: string;
  editedText: string;
  editHistory: EditOperation[];
  aiSuggestions: AISuggestion[];
  status: 'editing' | 'ai_processing' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface EditOperation {
  id: string;
  type: 'insert' | 'delete' | 'replace';
  position: number;
  content: string;
  timestamp: Date;
  source: 'user' | 'ai';
}

export interface AISuggestion {
  id: string;
  type: 'spelling' | 'grammar' | 'style' | 'structure';
  originalText: string;
  suggestedText: string;
  confidence: number;
  applied: boolean;
}

export interface Draft {
  id: string;
  wechatDraftId?: string;
  title: string;
  content: string;
  status: 'local' | 'uploaded' | 'published' | 'scheduled';
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  scheduledAt?: Date;
  thumbnailUrl?: string; // Add this if you intend to use it
}

export interface PublishOptions {
  targetAudience: 'all' | 'subscribers' | 'custom';
  customAudienceIds?: string[];
  enableComments: boolean;
  enableSharing: boolean;
}

export interface PublishSchedule {
  draftId: string;
  scheduledTime: Date;
  publishOptions: PublishOptions;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: Date;
  executedAt?: Date;
  error?: string;
}

export interface ScheduledTask {
  id: string;
  type: 'publish_article';
  payload: any;
  scheduledTime: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  executedAt?: Date;
  error?: string;
}

// Service interfaces
export interface AuthService {
  validatePassword(password: string): Promise<boolean>;
  createSession(userId: string): Promise<string>;
  validateSession(sessionId: string): Promise<boolean>;
  destroySession(sessionId: string): Promise<void>;
}

export interface VoiceService {
  transcribeAudio(audioBuffer: Buffer, userId: string): Promise<string>;
  validateAudioFormat(file: Express.Multer.File): boolean;
  createVoiceSession(userId: string): Promise<VoiceSession>;
  updateVoiceSession(sessionId: string, updates: Partial<VoiceSession>): Promise<VoiceSession>;
}

export interface AIEditingService {
  editContent(originalText: string, options: EditingOptions): Promise<string>;
  preserveWritingStyle(text: string, styleReference?: string): Promise<string>;
  correctSpellingAndGrammar(text: string): Promise<string>;
  reorganizeParagraphs(text: string): Promise<string>;
}

export interface WeChatService {
  saveToDraft(content: string, title: string): Promise<string>;
  getDraftList(): Promise<Draft[]>;
  publishArticle(draftId: string, publishOptions: PublishOptions): Promise<boolean>;
  schedulePublication(draftId: string, schedule: PublishSchedule): Promise<string>;
}

export interface SchedulerService {
  createScheduledTask(task: ScheduledTask): Promise<string>;
  cancelScheduledTask(taskId: string): Promise<boolean>;
  getScheduledTasks(): Promise<ScheduledTask[]>;
  executeTask(taskId: string): Promise<void>;
}

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface EditingOptions {
  level: 'light' | 'moderate' | 'heavy';
  preserveStyle: boolean;
  correctGrammar: boolean;
  reorganizeStructure: boolean;
}

// Authentication types
export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'passwordHash'>;
  sessionId: string;
}

// WeChat API response types
export interface CreateDraftResponse {
  media_id?: string;
  errcode?: number;
  errmsg?: string;
}

export interface UploadImgResponse {
  media_id?: string;
  url?: string;
  item?: any[];
  errcode?: number;
  errmsg?: string;
}
