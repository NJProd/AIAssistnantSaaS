// ===========================================
// Google Gemini Transcription Adapter (FREE!)
// Uses Gemini 1.5 Flash for audio transcription
// ===========================================

import { config } from '../../config';
import { TranscriptionAdapter, TranscriptionResult } from './transcription.adapter';

export class GeminiTranscriptionAdapter implements TranscriptionAdapter {
  name = 'google-gemini';
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = config.GEMINI_API_KEY;
    this.model = 'gemini-1.5-flash';
  }

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult> {
    const startTime = Date.now();

    // Convert buffer to base64
    const audioBase64 = audioBuffer.toString('base64');

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe this audio exactly. Only output the transcription text, nothing else. If you cannot understand the audio, output "[inaudible]".',
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    };

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Gemini transcription error:', errorData);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      // Extract transcription text
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      if (!text || text === '[inaudible]') {
        throw new Error('Could not transcribe audio');
      }

      return {
        text,
        confidence: 0.9,
        duration,
        language: 'en', // Gemini auto-detects
      };
    } catch (error: any) {
      console.error('Gemini transcription error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }
}
