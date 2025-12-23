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

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// AI Editing types
export interface EditingOptions {
  level: 'light' | 'moderate' | 'heavy';
  preserveStyle: boolean;
  correctGrammar: boolean;
  reorganizeStructure: boolean;
}

export interface EditingResult {
  originalText: string;
  editedText: string;
  options: EditingOptions;
  timestamp: string;
}

// Authentication types
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}

export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  user: User;
  sessionId: string;
}