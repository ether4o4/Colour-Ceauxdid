import { SwarmAgent, SwarmMessage, ApiConfig } from '../types';
import { getAgentMemory, getApiConfig } from '../store';

// Env-var fallbacks for dev / EAS preview builds. The user-entered
// API key in Settings always wins; env is just a default.
const ENV_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
const ENV_BASE_URL = process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL || '';

export class MissingApiKeyError extends Error {
  constructor() {
    super('No API key configured. Open Settings → API to add one.');
    this.name = 'MissingApiKeyError';
  }
}

async function resolveConfig(): Promise<ApiConfig> {
  const stored = await getApiConfig();
  return {
    provider: stored.provider,
    apiKey: stored.apiKey || ENV_API_KEY,
    baseUrl: stored.baseUrl || ENV_BASE_URL || 'https://openrouter.ai/api/v1',
    model: stored.model || 'openrouter/free',
  };
}

function authHeaders(cfg: ApiConfig): Record<string, string> {
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cfg.provider === 'anthropic') {
    base['x-api-key'] = cfg.apiKey;
    base['anthropic-version'] = '2023-06-01';
  } else {
    base['Authorization'] = `Bearer ${cfg.apiKey}`;
  }
  if (cfg.provider === 'openrouter') {
    base['HTTP-Referer'] = 'https://colour-ceauxdid.app';
    base['X-Title'] = 'Colour Ceauxdid';
  }
  return base;
}

// Each agent runs on a different model — genuinely different AI brains
const AGENT_MODELS: Record<string, string> = {
  red:    'deepseek/deepseek-r1:free',
  blue:   'qwen/qwen-2.5-72b-instruct:free',
  green:  'google/gemma-3-12b-it:free',
  yellow: 'meta-llama/llama-3.3-70b-instruct:free',
  purple: 'deepseek/deepseek-r1-distill-llama-70b:free',
};

interface ChatPayload {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens: number;
  temperature: number;
}

function buildPayload(
  cfg: ApiConfig,
  systemPrompt: string,
  apiMessages: Array<{ role: string; content: string }>,
  agent: SwarmAgent,
): any {
  const temperature = agent.id === 'yellow' ? 0.9 : agent.id === 'red' ? 0.3 : 0.7;
  const model = AGENT_MODELS[agent.id] || cfg.model;

  if (cfg.provider === 'anthropic') {
    return {
      model,
      max_tokens: 600,
      temperature,
      system: systemPrompt,
      messages: apiMessages,
    };
  }

  // OpenAI / OpenRouter / custom OpenAI-compatible
  return {
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...apiMessages],
    max_tokens: 600,
    temperature,
  };
}

function endpointFor(cfg: ApiConfig): string {
  const base = cfg.baseUrl.replace(/\/$/, '');
  if (cfg.provider === 'anthropic') return `${base}/messages`;
  return `${base}/chat/completions`;
}

function extractText(cfg: ApiConfig, json: any): string {
  if (cfg.provider === 'anthropic') {
    const blocks = json?.content;
    if (Array.isArray(blocks)) {
      return blocks.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('');
    }
    return '';
  }
  return json?.choices?.[0]?.message?.content || '';
}

async function emitSimulatedStream(
  fullText: string,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const chunkSize = 6;
  for (let i = 0; i < fullText.length; i += chunkSize) {
    onChunk(fullText.slice(i, i + chunkSize));
    if (i % 60 === 0) await new Promise(r => setTimeout(r, 12));
  }
}

export async function streamAgentResponse(
  agent: SwarmAgent,
  userMessage: string,
  chatHistory: SwarmMessage[],
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): Promise<void> {
  try {
    const cfg = await resolveConfig();
    if (!cfg.apiKey) {
      onError(new MissingApiKeyError().message);
      return;
    }

    const memory = await getAgentMemory(agent.id);
    const memoryContext = Object.keys(memory).length > 0
      ? `\n\nYour memory:\n${Object.entries(memory).map(([k, v]) => `${k}: ${v}`).join('\n')}`
      : '';
    const systemPrompt = agent.systemPrompt + memoryContext;

    const recent = chatHistory.slice(-15);
    const apiMessages = recent.map(m => ({
      role: m.senderId === 'user' ? 'user' : 'assistant',
      content: m.senderId !== 'user' ? `[${m.senderName}]: ${m.text}` : m.text,
    }));
    apiMessages.push({ role: 'user', content: userMessage });

    const response = await fetch(endpointFor(cfg), {
      method: 'POST',
      headers: authHeaders(cfg),
      body: JSON.stringify(buildPayload(cfg, systemPrompt, apiMessages, agent)),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = await response.text();
        try {
          const parsed = JSON.parse(errBody);
          detail = parsed?.error?.message || errBody.slice(0, 200);
        } catch {
          detail = errBody.slice(0, 200);
        }
      } catch {}
      onError(`API ${response.status}${detail ? `: ${detail}` : ''}`);
      return;
    }

    const json = await response.json();
    const text = extractText(cfg, json);
    if (!text) {
      onError('Empty response from model');
      return;
    }

    await emitSimulatedStream(text, onChunk);
    onDone();
  } catch (err: any) {
    onError(err?.message || 'Network error');
  }
}

export async function getSingleAgentResponse(
  agent: SwarmAgent,
  userMessage: string,
  chatHistory: SwarmMessage[],
): Promise<string> {
  return new Promise((resolve, reject) => {
    let full = '';
    streamAgentResponse(
      agent, userMessage, chatHistory,
      (chunk) => { full += chunk; },
      () => resolve(full),
      (err) => reject(new Error(err)),
    );
  });
}

export async function testApiConnection(): Promise<{ ok: boolean; detail?: string }> {
  try {
    const cfg = await resolveConfig();
    if (!cfg.apiKey) return { ok: false, detail: 'No API key set' };

    const response = await fetch(endpointFor(cfg), {
      method: 'POST',
      headers: authHeaders(cfg),
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 8,
        ...(cfg.provider === 'anthropic'
          ? { system: 'Reply with: ok', messages: [{ role: 'user', content: 'ping' }] }
          : { messages: [{ role: 'user', content: 'ping' }] }),
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      return { ok: false, detail: `HTTP ${response.status}: ${body.slice(0, 160)}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, detail: err?.message || 'Network error' };
  }
}
