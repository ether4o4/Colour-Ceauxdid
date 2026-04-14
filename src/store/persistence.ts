import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatState, AgentMemory } from '../types';

const CHAT_STATE_KEY = '@colour_ceauxdid:chat_state';
const AGENT_MEMORIES_KEY = '@colour_ceauxdid:agent_memories';
const CUSTOM_AGENTS_KEY = '@colour_ceauxdid:custom_agents';

export async function persistChatState(state: ChatState): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAT_STATE_KEY, JSON.stringify(state));
  } catch {
    // Silently handle storage errors
  }
}

export async function loadChatState(): Promise<ChatState | null> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_STATE_KEY);
    return raw ? (JSON.parse(raw) as ChatState) : null;
  } catch {
    return null;
  }
}

export async function persistAgentMemories(memories: Record<string, AgentMemory>): Promise<void> {
  try {
    await AsyncStorage.setItem(AGENT_MEMORIES_KEY, JSON.stringify(memories));
  } catch {
    // Silently handle storage errors
  }
}

export async function loadAgentMemories(): Promise<Record<string, AgentMemory> | null> {
  try {
    const raw = await AsyncStorage.getItem(AGENT_MEMORIES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AgentMemory>) : null;
  } catch {
    return null;
  }
}

export async function persistCustomAgents(agents: unknown[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CUSTOM_AGENTS_KEY, JSON.stringify(agents));
  } catch {
    // Silently handle storage errors
  }
}

export async function loadCustomAgents(): Promise<unknown[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_AGENTS_KEY);
    return raw ? (JSON.parse(raw) as unknown[]) : null;
  } catch {
    return null;
  }
}

export async function clearAllPersistedState(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([CHAT_STATE_KEY, AGENT_MEMORIES_KEY, CUSTOM_AGENTS_KEY]);
  } catch {
    // Silently handle storage errors
  }
}
