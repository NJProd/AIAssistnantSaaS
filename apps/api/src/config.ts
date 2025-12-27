// ===========================================
// Application Configuration
// ===========================================

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // API Server
  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),

  // LLM Provider (gemini is FREE!)
  LLM_PROVIDER: z.enum(['gemini', 'anthropic', 'openai']).default('gemini'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-20250514'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),

  // Transcription (gemini is FREE!)
  TRANSCRIPTION_PROVIDER: z.enum(['gemini', 'whisper', 'deepgram']).default('gemini'),
  DEEPGRAM_API_KEY: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Vector Search
  ENABLE_VECTOR_SEARCH: z.coerce.boolean().default(false),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;

// Validate LLM provider has required API key
if (config.LLM_PROVIDER === 'anthropic' && !config.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY is required when LLM_PROVIDER is "anthropic"');
  process.exit(1);
}

if (config.LLM_PROVIDER === 'openai' && !config.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is required when LLM_PROVIDER is "openai"');
  process.exit(1);
}

if (config.TRANSCRIPTION_PROVIDER === 'whisper' && !config.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is required for Whisper transcription');
  process.exit(1);
}

if (config.TRANSCRIPTION_PROVIDER === 'deepgram' && !config.DEEPGRAM_API_KEY) {
  console.error('❌ DEEPGRAM_API_KEY is required when TRANSCRIPTION_PROVIDER is "deepgram"');
  process.exit(1);
}
