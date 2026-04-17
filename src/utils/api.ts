import { SwarmAgent, SwarmMessage } from '../types';
import { getAgentMemory } from '../store';

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? '';
if (!OPENROUTER_API_KEY) {
  console.warn('⚠️ EXPO_PUBLIC_OPENROUTER_API_KEY is not set. API calls will fail. See .env.example');
}
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// Free models to use (in priority order)
const FREE_MODELS = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-2-9b-it:free',
];

export async function streamAgentResponse(
  agent: SwarmAgent,
  userMessage: string,
  chatHistory: SwarmMessage[],
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  try {
    // Get agent memory
    const memory = await getAgentMemory(agent.id);
    const memoryContext = Object.keys(memory).length > 0
      ? `\n\nYour memory:\n${Object.entries(memory).map(([k, v]) => `${k}: ${v}`).join('\n')}`
      : '';

    const systemPrompt = agent.systemPrompt + memoryContext;

    // Build message history (last 15 for efficiency)
    const recent = chatHistory.slice(-15);
    const apiMessages = recent.map(m => ({
      role: m.senderId === 'user' ? 'user' : 'assistant',
      content: m.senderId !== 'user' ? `[${m.senderName}]: ${m.text}` : m.text,
    }));

    // Add current user message
    apiMessages.push({ role: 'user', content: userMessage });

    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://colour-ceauxdid.app',
        'X-Title': 'Colour Ceauxdid',
      },
      body: JSON.stringify({
        model: FREE_MODELS[0],
        messages: [
          { role: 'system', content: systemPrompt },
          ...apiMessages,
        ],
        stream: true,
        max_tokens: 600,
        temperature: agent.id === 'yellow' ? 0.9 : agent.id === 'red' ? 0.3 : 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      onError(`API error: ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { onError('No stream'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (chunk) onChunk(chunk);
          } catch {}
        }
      }
    }

    onDone();
  } catch (err: any) {
    onError(err?.message || 'Network error');
  }
}

export async function getSingleAgentResponse(
  agent: SwarmAgent,
  userMessage: string,
  chatHistory: SwarmMessage[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    let full = '';
    streamAgentResponse(
      agent, userMessage, chatHistory,
      (chunk) => { full += chunk; },
      () => resolve(full),
      (err) => reject(new Error(err))
    );
  });
}
