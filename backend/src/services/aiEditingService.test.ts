import { describe, it, expect, beforeEach } from 'vitest';
import { AIEditingServiceImpl } from './aiEditingService.js';
import { EditingOptions } from '../types/index.js';

describe('AIEditingService', () => {
  let aiEditingService: AIEditingServiceImpl;

  beforeEach(() => {
    aiEditingService = new AIEditingServiceImpl();
  });

  describe('editContent', () => {
    it('should edit content with default options', async () => {
      const originalText = '这是一个测试文本，，需要AI编辑优化。。';
      const options: EditingOptions = {
        level: 'moderate',
        preserveStyle: true,
        correctGrammar: true,
        reorganizeStructure: false,
      };

      const result = await aiEditingService.editContent(originalText, options);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error for empty text', async () => {
      const options: EditingOptions = {
        level: 'moderate',
        preserveStyle: true,
        correctGrammar: true,
        reorganizeStructure: false,
      };

      await expect(aiEditingService.editContent('', options)).rejects.toThrow('原始文本不能为空');
    });

    it('should handle different editing levels', async () => {
      const originalText = '这是一个测试文本。';
      
      const lightResult = await aiEditingService.editContent(originalText, {
        level: 'light',
        preserveStyle: true,
        correctGrammar: true,
        reorganizeStructure: false,
      });

      const heavyResult = await aiEditingService.editContent(originalText, {
        level: 'heavy',
        preserveStyle: true,
        correctGrammar: true,
        reorganizeStructure: false,
      });

      expect(lightResult).toBeDefined();
      expect(heavyResult).toBeDefined();
      expect(typeof lightResult).toBe('string');
      expect(typeof heavyResult).toBe('string');
    });
  });

  describe('correctSpellingAndGrammar', () => {
    it('should correct grammar errors', async () => {
      const textWithErrors = '这是一个测试文本，，有语法错误。。';
      
      const result = await aiEditingService.correctSpellingAndGrammar(textWithErrors);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('reorganizeParagraphs', () => {
    it('should reorganize paragraph structure', async () => {
      const longText = '这是第一句话。这是第二句话。这是第三句话。这是第四句话。这是第五句话。';
      
      const result = await aiEditingService.reorganizeParagraphs(longText);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('preserveWritingStyle', () => {
    it('should preserve writing style', async () => {
      const originalText = '这是一个测试文本。';
      
      const result = await aiEditingService.preserveWritingStyle(originalText);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should preserve style with reference', async () => {
      const originalText = '这是一个测试文本。';
      const styleReference = '这是参考风格的示例文本。';
      
      const result = await aiEditingService.preserveWritingStyle(originalText, styleReference);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('generateAISuggestions', () => {
    it('should generate suggestions for text', async () => {
      const text = '这是一个测试文本，，有一些问题。。';
      
      const suggestions = await aiEditingService.generateAISuggestions(text);
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('editing sessions', () => {
    it('should create editing session', async () => {
      const userId = 'test-user';
      const text = '这是测试文本。';
      
      const session = await aiEditingService.createEditingSession(userId, text);
      
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.originalText).toBe(text);
      expect(session.status).toBe('editing');
    });

    it('should update editing session', async () => {
      const sessionId = 'test-session-id';
      const updates = {
        editedText: '编辑后的文本',
        status: 'completed' as const,
      };
      
      const session = await aiEditingService.updateEditingSession(sessionId, updates);
      
      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);
      expect(session.editedText).toBe(updates.editedText);
      expect(session.status).toBe(updates.status);
    });
  });
});