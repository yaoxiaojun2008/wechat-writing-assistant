import { useState, useCallback, useRef } from 'react';
import { voiceRecordingService, webSpeechService, TranscriptionResult } from '../services/voiceService';

export interface VoiceRecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  transcribedText: string;
  error: string | null;
  isSupported: boolean;
}

export interface VoiceRecordingActions {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  clearText: () => void;
  appendText: (text: string) => void;
  testMicrophone: () => Promise<{
    hasPermission: boolean;
    canRecord: boolean;
    message: string;
  }>;
}

export function useVoiceRecording(): VoiceRecordingState & VoiceRecordingActions {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Prefer Web Speech API for better user experience and no server costs
  const preferWebSpeech = webSpeechService.isSupported();
  const recognitionPromiseRef = useRef<Promise<string> | null>(null);
  
  // Check if voice recording is supported
  const isSupported = preferWebSpeech || ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices);

  const startRecording = useCallback(async () => {
    if (isRecording || isProcessing) {
      return;
    }

    setError(null);
    setIsRecording(true);

    try {
      if (preferWebSpeech) {
        // Start Web Speech API recognition immediately
        console.log('Starting Web Speech API recognition');
        recognitionPromiseRef.current = webSpeechService.startListening();
      } else {
        // Fallback to WebRTC recording + server transcription
        await voiceRecordingService.startRecording({
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        });
        console.log('Started WebRTC recording');
      }
    } catch (error) {
      setIsRecording(false);
      setError(error instanceof Error ? error.message : '语音录制启动失败');
      recognitionPromiseRef.current = null;
    }
  }, [isRecording, isProcessing, preferWebSpeech]);

  const stopRecording = useCallback(async () => {
    if (!isRecording) {
      return;
    }

    setIsRecording(false);
    setIsProcessing(true);
    setError(null);

    try {
      let transcriptionResult: TranscriptionResult;

      if (preferWebSpeech && recognitionPromiseRef.current) {
        // Stop Web Speech API and get result
        console.log('Stopping Web Speech API recognition');
        webSpeechService.stopListening();
        
        const speechText = await recognitionPromiseRef.current;
        recognitionPromiseRef.current = null;
        
        transcriptionResult = {
          transcribedText: speechText,
          timestamp: new Date().toISOString(),
        };
        console.log('Web Speech API result:', speechText);
      } else {
        // Fallback to WebRTC recording + server transcription
        const audioBlob = await voiceRecordingService.stopRecording();
        transcriptionResult = await voiceRecordingService.transcribeAudio(audioBlob);
        console.log('Server transcription result:', transcriptionResult.transcribedText);
      }

      if (transcriptionResult.transcribedText.trim()) {
        setTranscribedText(prev => {
          const newText = transcriptionResult.transcribedText.trim();
          return prev ? `${prev}\n${newText}` : newText;
        });
      } else {
        setError('未检测到语音内容，请重试');
      }
    } catch (error) {
      console.error('Voice transcription error:', error);
      setError(error instanceof Error ? error.message : '语音转文字失败，请重试');
    } finally {
      setIsProcessing(false);
      recognitionPromiseRef.current = null;
    }
  }, [isRecording, preferWebSpeech]);

  const clearText = useCallback(() => {
    setTranscribedText('');
    setError(null);
  }, []);

  const appendText = useCallback((text: string) => {
    if (text.trim()) {
      setTranscribedText(prev => prev ? `${prev}\n${text.trim()}` : text.trim());
    }
  }, []);

  const testMicrophone = useCallback(async () => {
    if (isRecording || isProcessing) {
      return {
        hasPermission: false,
        canRecord: false,
        message: '请先停止当前的录音操作'
      };
    }

    setError(null);
    setIsProcessing(true);

    try {
      const result = await webSpeechService.testMicrophone();
      
      if (result.hasPermission && result.canRecord) {
        setError(null);
      } else {
        setError(result.message);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '麦克风测试失败';
      setError(errorMessage);
      
      return {
        hasPermission: false,
        canRecord: false,
        message: errorMessage
      };
    } finally {
      setIsProcessing(false);
    }
  }, [isRecording, isProcessing]);

  return {
    isRecording,
    isProcessing,
    transcribedText,
    error,
    isSupported,
    startRecording,
    stopRecording,
    clearText,
    appendText,
    testMicrophone,
  };
}