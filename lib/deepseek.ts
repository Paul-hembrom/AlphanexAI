import OpenAI from 'openai';

let _deepseekInstance: OpenAI | null = null;

export function getDeepSeekClient(): OpenAI {
  if (!_deepseekInstance) {
    const apiKey =
      process.env.DEEPSEEK_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      process.env.openrouter_api_key;

    if (!apiKey) {
      throw new Error(
        'Neither DEEPSEEK_API_KEY nor OPENROUTER_API_KEY is configured. Please configure your API key in environment settings.'
      );
    }

    const isOpenRouter = !process.env.DEEPSEEK_API_KEY && Boolean(process.env.OPENROUTER_API_KEY || process.env.openrouter_api_key);
    const baseURL =
      process.env.DEEPSEEK_BASE_URL ||
      (isOpenRouter ? 'https://openrouter.ai/api/v1' : 'https://api.deepseek.com');

    _deepseekInstance = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: isOpenRouter
        ? {
            'HTTP-Referer': process.env.APP_URL || 'https://aistudio-build.local',
            'X-Title': 'Alphanex AI Studio',
          }
        : undefined,
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

export const MODEL_ID =
  process.env.DEEPSEEK_MODEL ||
  (!process.env.DEEPSEEK_API_KEY && (process.env.OPENROUTER_API_KEY || process.env.openrouter_api_key)
    ? 'deepseek/deepseek-chat'
    : 'deepseek-chat');
