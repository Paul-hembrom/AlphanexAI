import OpenAI from 'openai';

let _deepseekInstance: OpenAI | null = null;

export function getDeepSeekClient(): OpenAI {
  if (!_deepseekInstance) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error(
        'DEEPSEEK_API_KEY is not configured. Please add DEEPSEEK_API_KEY to your environment variables.'
      );
    }
    _deepseekInstance = new OpenAI({
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    });
  }
  return _deepseekInstance;
}

/**
 * Lazy proxy to OpenAI instance so module loading never crashes on missing env keys.
 */
export const deepseek = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    const client = getDeepSeekClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export const MODEL_ID = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
