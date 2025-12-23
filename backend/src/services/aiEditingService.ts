import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AIEditingService, EditingOptions, EditingSession, AISuggestion } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { createError } from '../middleware/errorHandler.js';

class AIEditingServiceImpl implements AIEditingService {
  private openai: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private readonly maxRetries = 3;
  private readonly timeout = 30000; // 30 seconds
  private readonly aiProvider: string;

  constructor() {
    this.aiProvider = config.ai.provider;
    
    if (this.aiProvider === 'gemini') {
      if (!config.ai.gemini.apiKey || config.ai.gemini.apiKey === 'your-gemini-api-key-here') {
        logger.warn('Gemini API key not configured, AI editing will use mock responses');
      } else {
        this.gemini = new GoogleGenerativeAI(config.ai.gemini.apiKey);
        logger.info('Gemini AI initialized for content editing');
      }
    } else {
      // Default to OpenAI
      if (!config.ai.openai.apiKey || config.ai.openai.apiKey === 'your-openai-api-key') {
        logger.warn('OpenAI API key not configured, AI editing will use mock responses');
      } else {
        this.openai = new OpenAI({
          apiKey: config.ai.openai.apiKey,
        });
        logger.info('OpenAI initialized for content editing');
      }
    }
  }

  async editContent(originalText: string, options: EditingOptions): Promise<string> {
    try {
      logger.info('Starting AI content editing', { 
        provider: this.aiProvider,
        textLength: originalText.length, 
        options 
      });

      if (!originalText.trim()) {
        throw createError('原始文本不能为空', 400);
      }

      // If no AI provider is configured, return mock edited content
      if (!this.openai && !this.gemini) {
        logger.info('Using mock AI editing (no AI provider configured)');
        return this.mockEditContent(originalText, options);
      }

      const prompt = this.buildEditingPrompt(originalText, options);
      
      try {
        let editedText: string;
        
        if (this.aiProvider === 'gemini' && this.gemini) {
          editedText = await this.callGemini(prompt);
        } else if (this.openai) {
          const completion = await this.callOpenAI(prompt);
          editedText = this.extractEditedContent(completion);
        } else {
          throw new Error('No AI provider available');
        }

        logger.info('AI content editing completed successfully');
        return editedText;
      } catch (apiError) {
        logger.warn(`${this.aiProvider} API failed, falling back to mock editing:`, apiError);
        return this.mockEditContent(originalText, options);
      }
    } catch (error) {
      logger.error('AI content editing failed:', error);
      
      if (error instanceof Error && error.message.includes('原始文本不能为空')) {
        throw error;
      }
      
      // For any other error, fall back to mock
      logger.info('Falling back to mock editing due to error');
      return this.mockEditContent(originalText, options);
    }
  }

  async preserveWritingStyle(text: string, styleReference?: string): Promise<string> {
    try {
      logger.info('Preserving writing style', { textLength: text.length });

      if (!this.openai && !this.gemini) {
        logger.info('Using mock style preservation (no AI provider configured)');
        return this.mockPreserveStyle(text);
      }

      const prompt = this.buildStylePreservationPrompt(text, styleReference);
      
      try {
        const completion = await this.callAI(prompt);
        return this.extractEditedContent(completion);
      } catch (apiError) {
        logger.warn(`${this.aiProvider} API failed, falling back to mock style preservation:`, apiError);
        return this.mockPreserveStyle(text);
      }
    } catch (error) {
      logger.error('Style preservation failed:', error);
      // Always fall back to mock
      return this.mockPreserveStyle(text);
    }
  }

  async correctSpellingAndGrammar(text: string): Promise<string> {
    try {
      logger.info('Correcting spelling and grammar', { textLength: text.length });

      if (!this.openai && !this.gemini) {
        logger.info('Using mock grammar correction (no AI provider configured)');
        return this.mockCorrectGrammar(text);
      }

      const prompt = this.buildGrammarCorrectionPrompt(text);
      
      try {
        const completion = await this.callAI(prompt);
        return this.extractEditedContent(completion);
      } catch (apiError) {
        logger.warn(`${this.aiProvider} API failed, falling back to mock grammar correction:`, apiError);
        return this.mockCorrectGrammar(text);
      }
    } catch (error) {
      logger.error('Grammar correction failed:', error);
      // Always fall back to mock for grammar correction
      return this.mockCorrectGrammar(text);
    }
  }

  async reorganizeParagraphs(text: string): Promise<string> {
    try {
      logger.info('Reorganizing paragraphs', { textLength: text.length });

      if (!this.openai && !this.gemini) {
        logger.info('Using mock paragraph reorganization (no AI provider configured)');
        return this.mockReorganizeParagraphs(text);
      }

      const prompt = this.buildReorganizationPrompt(text);
      
      try {
        const completion = await this.callAI(prompt);
        return this.extractEditedContent(completion);
      } catch (apiError) {
        logger.warn(`${this.aiProvider} API failed, falling back to mock reorganization:`, apiError);
        return this.mockReorganizeParagraphs(text);
      }
    } catch (error) {
      logger.error('Paragraph reorganization failed:', error);
      // Always fall back to mock
      return this.mockReorganizeParagraphs(text);
    }
  }

  private buildEditingPrompt(text: string, options: EditingOptions): string {
    let prompt = `你是一个专业的微信公众号内容编辑，请对以下语音转录文本进行深度优化：\n\n`;
    
    // Add specific instructions based on editing level
    switch (options.level) {
      case 'light':
        prompt += `编辑要求（轻度）：\n`;
        prompt += `- 修正语法错误和错别字\n`;
        prompt += `- 调整明显不通顺的表达\n`;
        break;
      case 'moderate':
        prompt += `编辑要求（中等）：\n`;
        prompt += `- 将口语化表达转换为书面语\n`;
        prompt += `- 优化句式结构，提高可读性\n`;
        prompt += `- 添加适当的过渡词和连接词\n`;
        prompt += `- 调整段落结构，使逻辑更清晰\n`;
        break;
      case 'heavy':
        prompt += `编辑要求（深度）：\n`;
        prompt += `- 全面重写，大幅提升文章质量\n`;
        prompt += `- 丰富内容表达，增加细节描述\n`;
        prompt += `- 优化标题和小标题结构\n`;
        prompt += `- 增强文章的吸引力和可读性\n`;
        break;
    }

    if (options.correctGrammar) {
      prompt += `- 彻底修正所有语法和拼写错误\n`;
    }

    if (options.reorganizeStructure) {
      prompt += `- 重新组织内容结构，确保逻辑清晰\n`;
      prompt += `- 添加合适的段落分隔和小标题\n`;
    }

    if (options.preserveStyle) {
      prompt += `- 在优化的同时保持作者的个人风格\n`;
    }

    prompt += `\n特别要求：\n`;
    prompt += `- 将语音转录的口语化内容转换为适合阅读的书面文章\n`;
    prompt += `- 补充语音中可能遗漏的标点符号和段落分隔\n`;
    prompt += `- 确保内容适合微信公众号的阅读习惯\n`;
    prompt += `- 保持原意的同时，让表达更加精准和有吸引力\n\n`;
    
    prompt += `原始语音转录文本：\n${text}\n\n`;
    prompt += `请直接返回优化后的文章，不要添加任何解释：`;

    return prompt;
  }

  private buildStylePreservationPrompt(text: string, styleReference?: string): string {
    let prompt = `请编辑以下文本，重点保持原有的写作风格：\n\n`;
    
    if (styleReference) {
      prompt += `参考风格示例：\n${styleReference}\n\n`;
    }
    
    prompt += `要编辑的文本：\n${text}\n\n`;
    prompt += `要求：\n`;
    prompt += `- 保持原文的语调、用词习惯和表达方式\n`;
    prompt += `- 只修正明显的错误，不改变风格特征\n`;
    prompt += `- 保持句式结构的相似性\n\n`;
    prompt += `请直接返回编辑后的文本：`;

    return prompt;
  }

  private buildGrammarCorrectionPrompt(text: string): string {
    return `请修正以下中文文本中的语法错误和错别字，保持原意不变：\n\n${text}\n\n请直接返回修正后的文本：`;
  }

  private buildReorganizationPrompt(text: string): string {
    return `请重新组织以下文本的段落结构，使逻辑更清晰，但保持原有内容和风格：\n\n${text}\n\n要求：\n- 优化段落划分\n- 改善逻辑顺序\n- 保持原有内容完整\n- 适合微信公众号阅读\n\n请直接返回重组后的文本：`;
  }

  private async callOpenAI(prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`OpenAI API call attempt ${attempt}/${this.maxRetries}`);

        const completion = await Promise.race([
          this.openai.chat.completions.create({
            model: config.openai.model,
            messages: [
              {
                role: 'system',
                content: '你是一个专业的中文文本编辑助手，专门为微信公众号内容进行优化。请始终用中文回复，并直接返回编辑后的文本，不要添加任何解释。'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 2000,
            temperature: 0.3,
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('OpenAI API timeout')), this.timeout)
          )
        ]);

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('OpenAI API returned empty response');
        }

        return content;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`OpenAI API call attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('OpenAI API call failed after all retries');
  }

  private async callGemini(prompt: string): Promise<string> {
    if (!this.gemini) {
      throw new Error('Gemini client not initialized');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`Gemini API call attempt ${attempt}/${this.maxRetries}`);

        const model = this.gemini.getGenerativeModel({ 
          model: config.ai.gemini.model,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
          },
        });

        const systemPrompt = '你是一个专业的微信公众号内容编辑专家，擅长将语音转录文本优化为高质量的公众号文章。你的任务是大幅改善文本质量，将口语化内容转换为书面语，优化结构和表达，但保持原意不变。请始终用中文回复，直接返回优化后的文章内容，不要添加任何解释。';
        const fullPrompt = `${systemPrompt}\n\n${prompt}`;

        const result = await Promise.race([
          model.generateContent(fullPrompt),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Gemini API timeout')), this.timeout)
          )
        ]);

        const response = await result.response;
        const content = response.text();
        
        if (!content) {
          throw new Error('Gemini API returned empty response');
        }

        return content;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Gemini API call attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Gemini API call failed after all retries');
  }

  private async callAI(prompt: string): Promise<string> {
    if (this.aiProvider === 'gemini' && this.gemini) {
      return await this.callGemini(prompt);
    } else if (this.openai) {
      return await this.callOpenAI(prompt);
    } else {
      throw new Error('No AI provider available');
    }
  }

  private extractEditedContent(response: string): string {
    // Clean up the response by removing any unwanted prefixes or suffixes
    let cleaned = response.trim();
    
    // Remove common AI response patterns
    const patterns = [
      /^编辑后的文本：?\s*/i,
      /^修正后的文本：?\s*/i,
      /^优化后的文本：?\s*/i,
      /^以下是编辑后的内容：?\s*/i,
    ];

    for (const pattern of patterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    return cleaned.trim();
  }

  // Mock implementations for when AI API is not available
  private async mockEditContent(text: string, options: EditingOptions): Promise<string> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    let editedText = text;
    
    // Apply more substantial mock edits to show clear improvement
    if (options.correctGrammar) {
      editedText = editedText
        .replace(/，，/g, '，')
        .replace(/。。/g, '。')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Add more substantial improvements for moderate/heavy editing
    if (options.level === 'moderate' || options.level === 'heavy') {
      // Convert some common spoken patterns to written form
      editedText = editedText
        .replace(/那个/g, '')
        .replace(/就是说/g, '')
        .replace(/然后呢/g, '然后')
        .replace(/嗯/g, '')
        .replace(/啊/g, '')
        .replace(/呃/g, '')
        .replace(/这样子/g, '这样')
        .replace(/的话/g, '')
        .trim();
      
      // Add some structure improvements
      if (options.reorganizeStructure) {
        const sentences = editedText.split(/[。！？]/);
        if (sentences.length > 3) {
          const midPoint = Math.floor(sentences.length / 2);
          editedText = sentences.slice(0, midPoint).join('。') + '。\n\n' + 
                     sentences.slice(midPoint).join('。') + '。';
        }
      }
      
      // Add a more substantial mock improvement
      editedText = `【AI优化版本】\n\n${editedText}\n\n[注：由于API配额限制，此为模拟优化结果。实际AI编辑效果会更加显著。]`;
    }

    return editedText;
  }

  private async mockPreserveStyle(text: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 800));
    return text.replace(/\s+/g, ' ').trim();
  }

  private async mockCorrectGrammar(text: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 600));
    return text
      .replace(/，，/g, '，')
      .replace(/。。/g, '。')
      .replace(/！！/g, '！')
      .replace(/？？/g, '？')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async mockReorganizeParagraphs(text: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Simple paragraph reorganization
    const sentences = text.split(/[。！？]/);
    if (sentences.length <= 2) {
      return text;
    }

    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];

    sentences.forEach((sentence, index) => {
      if (sentence.trim()) {
        currentParagraph.push(sentence.trim());
        
        // Create paragraph breaks every 2-3 sentences
        if (currentParagraph.length >= 2 && (index % 3 === 0 || index === sentences.length - 1)) {
          paragraphs.push(currentParagraph.join('。') + '。');
          currentParagraph = [];
        }
      }
    });

    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join('。') + '。');
    }

    return paragraphs.join('\n\n');
  }

  // Additional utility methods for editing sessions
  async createEditingSession(userId: string, originalText: string): Promise<EditingSession> {
    const session: EditingSession = {
      id: uuidv4(),
      userId,
      originalText,
      editedText: '',
      editHistory: [],
      aiSuggestions: [],
      status: 'editing',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logger.info(`Created editing session: ${session.id} for user: ${userId}`);
    return session;
  }

  async updateEditingSession(sessionId: string, updates: Partial<EditingSession>): Promise<EditingSession> {
    // In a real implementation, this would update the session in the database
    const session: EditingSession = {
      id: sessionId,
      userId: updates.userId || '',
      originalText: updates.originalText || '',
      editedText: updates.editedText || '',
      editHistory: updates.editHistory || [],
      aiSuggestions: updates.aiSuggestions || [],
      status: updates.status || 'completed',
      createdAt: updates.createdAt || new Date(),
      updatedAt: new Date(),
    };

    logger.info(`Updated editing session: ${sessionId}`);
    return session;
  }

  async generateAISuggestions(text: string): Promise<AISuggestion[]> {
    try {
      if (!this.openai && !this.gemini) {
        return this.mockGenerateSuggestions(text);
      }

      const prompt = `请分析以下中文文本，提供具体的改进建议。对于每个建议，请指出问题类型（拼写、语法、风格、结构）、原文片段和建议修改：\n\n${text}`;
      
      const completion = await this.callAI(prompt);
      return this.parseAISuggestions(completion);
    } catch (error) {
      logger.error('Failed to generate AI suggestions:', error);
      return [];
    }
  }

  private parseAISuggestions(_response: string): AISuggestion[] {
    // This is a simplified parser - in a real implementation, 
    // you might want to use a more structured approach
    
    // For now, return mock suggestions
    return this.mockGenerateSuggestions('');
  }

  private mockGenerateSuggestions(text: string): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    
    // Generate some mock suggestions based on common patterns
    if (text.includes('，，')) {
      suggestions.push({
        id: uuidv4(),
        type: 'grammar',
        originalText: '，，',
        suggestedText: '，',
        confidence: 0.95,
        applied: false,
      });
    }

    if (text.length > 200 && !text.includes('\n\n')) {
      suggestions.push({
        id: uuidv4(),
        type: 'structure',
        originalText: text,
        suggestedText: '建议添加段落分隔以提高可读性',
        confidence: 0.8,
        applied: false,
      });
    }

    return suggestions;
  }
}

export const aiEditingService = new AIEditingServiceImpl();

// Export service class for testing
export { AIEditingServiceImpl };