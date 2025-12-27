// ===========================================
// Transcription Adapter Factory
// ===========================================

import { config } from '../../config';
import { TranscriptionAdapter } from './transcription.adapter';
import { GeminiTranscriptionAdapter } from './gemini.adapter';
import { WhisperAdapter } from './whisper.adapter';

let transcriptionInstance: TranscriptionAdapter | null = null;

export function getTranscriptionAdapter(): TranscriptionAdapter {
  if (transcriptionInstance) {
    return transcriptionInstance;
  }

  switch (config.TRANSCRIPTION_PROVIDER) {
    case 'gemini':
      transcriptionInstance = new GeminiTranscriptionAdapter();
      break;
    case 'whisper':
      transcriptionInstance = new WhisperAdapter();
      break;
    case 'deepgram':
      // Could add Deepgram adapter here in future
      throw new Error('Deepgram adapter not yet implemented - use gemini or whisper');
    default:
      throw new Error(`Unknown transcription provider: ${config.TRANSCRIPTION_PROVIDER}`);
  }

  console.log(`🎤 Transcription Adapter initialized: ${transcriptionInstance.name}`);
  return transcriptionInstance;
}

export * from './transcription.adapter';
