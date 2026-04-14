import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Agent,
  AgentMemory,
  AgentMemoryEntry,
  AgentStatus,
  ChatState,
  Message,
  OrchestratorConfig,
  SharedMemoryEntry,
  StoredFile,
  Task,
} from '../types';
import { DEFAULT_AGENTS } from '../constants/agents';
import {
  persistChatState,
  persistAgentMemories,
  persistCustomAgents,
  loadChatState,
  loadAgentMemories,
  loadCustomAgents,
} from './persistence';
import {
  parseAddressing,
  routeMessage,
  shouldSummon,
  getDebateOrder,
  isPriorityInterrupt,
} from '../engine/router';
import {
  generateAgentResponse,
  calculateConfidenceScore,
} from '../engine/responseGenerator';

// ─── Initial State ────────────────────────────────────────────────────────────

function makeDefaultAgents(): Agent[] {
  return DEFAULT_AGENTS.map(a => ({
    ...a,
    status: 'idle' as AgentStatus,
    lastResponseAt: undefined,
    cooldownUntil: undefined,
    confidenceScore: undefined,
  }));
}

function makeDefaultMemory(agentId: string): AgentMemory {
  return {
    agentId,
    entries: [],
    contextSummary: '',
    lastUpdated: Date.now(),
  };
}

function makeInitialAgentMemories(agents: Agent[]): Record<string, AgentMemory> {
  const mem: Record<string, AgentMemory> = {};
  for (const a of agents) {
    mem[a.id] = makeDefaultMemory(a.id);
  }
  return mem;
}

function makeInitialChatState(): ChatState {
  return {
    messages: [],
    tasks: [],
    activeTaskIds: [],
    typingAgentIds: [],
    sharedMemory: [],
    storedFiles: [],
    sessionId: uuidv4(),
    createdAt: Date.now(),
  };
}

const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  mode: 'normal',
  maxSimultaneousResponders: 3,
  summonVisibility: 'visible',
  responseDelayMs: 800,
  confidenceScoringEnabled: true,
  debateModeEnabled: false,
  priorityInterruptEnabled: true,
};

interface StoreState {
  agents: Agent[];
  agentMemories: Record<string, AgentMemory>;
  chatState: ChatState;
  orchestratorConfig: OrchestratorConfig;
  isLoading: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD_PERSISTED'; payload: Partial<StoreState> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_CUSTOM_AGENT'; payload: Agent }
  | { type: 'UPDATE_AGENT'; payload: { id: string; updates: Partial<Agent> } }
  | { type: 'REMOVE_CUSTOM_AGENT'; payload: string }
  | { type: 'SET_AGENT_STATUS'; payload: { id: string; status: AgentStatus } }
  | { type: 'RESET_AGENT_MEMORY'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_TYPING'; payload: { agentId: string; isTyping: boolean } }
  | { type: 'CLEAR_CHAT' }
  | { type: 'CREATE_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'CANCEL_TASK'; payload: string }
  | { type: 'ADD_MEMORY_ENTRY'; payload: { agentId: string; entry: AgentMemoryEntry } }
  | { type: 'ADD_SHARED_MEMORY'; payload: SharedMemoryEntry }
  | { type: 'CREATE_FILE'; payload: StoredFile }
  | { type: 'UPDATE_FILE'; payload: { id: string; content: string } }
  | { type: 'DELETE_FILE'; payload: string }
  | { type: 'UPDATE_ORCHESTRATOR_CONFIG'; payload: Partial<OrchestratorConfig> };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'LOAD_PERSISTED':
      return { ...state, ...action.payload, isLoading: false };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'ADD_CUSTOM_AGENT': {
      const newAgents = [...state.agents, action.payload];
      const newMems = {
        ...state.agentMemories,
        [action.payload.id]: makeDefaultMemory(action.payload.id),
      };
      return { ...state, agents: newAgents, agentMemories: newMems };
    }

    case 'UPDATE_AGENT':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.payload.id ? { ...a, ...action.payload.updates } : a,
        ),
      };

    case 'REMOVE_CUSTOM_AGENT': {
      const remaining = state.agents.filter(
        a => a.id !== action.payload || a.isDefault,
      );
      const { [action.payload]: _removed, ...remainingMems } = state.agentMemories;
      return { ...state, agents: remaining, agentMemories: remainingMems };
    }

    case 'SET_AGENT_STATUS':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.payload.id ? { ...a, status: action.payload.status } : a,
        ),
      };

    case 'RESET_AGENT_MEMORY':
      return {
        ...state,
        agentMemories: {
          ...state.agentMemories,
          [action.payload]: makeDefaultMemory(action.payload),
        },
      };

    case 'ADD_MESSAGE':
      return {
        ...state,
        chatState: {
          ...state.chatState,
          messages: [...state.chatState.messages, action.payload],
        },
      };

    case 'SET_TYPING': {
      const { agentId, isTyping } = action.payload;
      const current = state.chatState.typingAgentIds;
      const updated = isTyping
        ? current.includes(agentId) ? current : [...current, agentId]
        : current.filter(id => id !== agentId);
      return {
        ...state,
        chatState: { ...state.chatState, typingAgentIds: updated },
      };
    }

    case 'CLEAR_CHAT':
      return {
        ...state,
        chatState: makeInitialChatState(),
      };

    case 'CREATE_TASK':
      return {
        ...state,
        chatState: {
          ...state.chatState,
          tasks: [...state.chatState.tasks, action.payload],
          activeTaskIds: [...state.chatState.activeTaskIds, action.payload.id],
        },
      };

    case 'UPDATE_TASK': {
      const updatedTasks = state.chatState.tasks.map(t =>
        t.id === action.payload.id ? { ...t, ...action.payload.updates } : t,
      );
      const activeIds =
        action.payload.updates.status === 'complete' ||
        action.payload.updates.status === 'failed' ||
        action.payload.updates.status === 'cancelled'
          ? state.chatState.activeTaskIds.filter(id => id !== action.payload.id)
          : state.chatState.activeTaskIds;
      return {
        ...state,
        chatState: { ...state.chatState, tasks: updatedTasks, activeTaskIds: activeIds },
      };
    }

    case 'CANCEL_TASK': {
      const updatedTasks = state.chatState.tasks.map(t =>
        t.id === action.payload ? { ...t, status: 'cancelled' as const } : t,
      );
      return {
        ...state,
        chatState: {
          ...state.chatState,
          tasks: updatedTasks,
          activeTaskIds: state.chatState.activeTaskIds.filter(id => id !== action.payload),
        },
      };
    }

    case 'ADD_MEMORY_ENTRY': {
      const { agentId, entry } = action.payload;
      const mem = state.agentMemories[agentId] ?? makeDefaultMemory(agentId);
      return {
        ...state,
        agentMemories: {
          ...state.agentMemories,
          [agentId]: {
            ...mem,
            entries: [...mem.entries.slice(-99), entry],
            lastUpdated: Date.now(),
          },
        },
      };
    }

    case 'ADD_SHARED_MEMORY':
      return {
        ...state,
        chatState: {
          ...state.chatState,
          sharedMemory: [...state.chatState.sharedMemory, action.payload],
        },
      };

    case 'CREATE_FILE':
      return {
        ...state,
        chatState: {
          ...state.chatState,
          storedFiles: [...state.chatState.storedFiles, action.payload],
        },
      };

    case 'UPDATE_FILE':
      return {
        ...state,
        chatState: {
          ...state.chatState,
          storedFiles: state.chatState.storedFiles.map(f =>
            f.id === action.payload.id
              ? { ...f, content: action.payload.content, updatedAt: Date.now() }
              : f,
          ),
        },
      };

    case 'DELETE_FILE':
      return {
        ...state,
        chatState: {
          ...state.chatState,
          storedFiles: state.chatState.storedFiles.filter(f => f.id !== action.payload),
        },
      };

    case 'UPDATE_ORCHESTRATOR_CONFIG':
      return {
        ...state,
        orchestratorConfig: { ...state.orchestratorConfig, ...action.payload },
      };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface StoreContextValue {
  state: StoreState;
  dispatch: React.Dispatch<Action>;
  sendUserMessage: (text: string) => void;
  addCustomAgent: (agent: Omit<Agent, 'id' | 'isDefault' | 'memoryId' | 'status' | 'priority'>) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeCustomAgent: (id: string) => void;
  muteAgent: (id: string, muted: boolean) => void;
  disableAgent: (id: string, disabled: boolean) => void;
  resetAgentMemory: (id: string) => void;
  clearChat: () => void;
  cancelTask: (id: string) => void;
  createFile: (file: Omit<StoredFile, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateFile: (id: string, content: string) => void;
  deleteFile: (id: string) => void;
  updateOrchestratorConfig: (updates: Partial<OrchestratorConfig>) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

const SUMMON_COOLDOWN_MS = 10_000;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const defaultAgents = makeDefaultAgents();
  const [state, dispatch] = useReducer(reducer, {
    agents: defaultAgents,
    agentMemories: makeInitialAgentMemories(defaultAgents),
    chatState: makeInitialChatState(),
    orchestratorConfig: DEFAULT_ORCHESTRATOR_CONFIG,
    isLoading: true,
  });

  // Ref to always have latest state inside async callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Load persisted state on mount ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [chatState, memories, customAgents] = await Promise.all([
        loadChatState(),
        loadAgentMemories(),
        loadCustomAgents(),
      ]);

      const baseAgents = makeDefaultAgents();
      const loadedCustom: Agent[] = Array.isArray(customAgents) ? (customAgents as Agent[]) : [];
      const allAgents = [...baseAgents, ...loadedCustom];

      const baseMems = makeInitialAgentMemories(allAgents);
      const loadedMems: Record<string, AgentMemory> = memories ?? {};
      const mergedMems = { ...baseMems, ...loadedMems };

      dispatch({
        type: 'LOAD_PERSISTED',
        payload: {
          agents: allAgents,
          agentMemories: mergedMems,
          chatState: chatState ?? makeInitialChatState(),
          isLoading: false,
        },
      });
    })();
  }, []);

  // ── Auto-persist on state changes ─────────────────────────────────────────
  useEffect(() => {
    if (!state.isLoading) {
      persistChatState(state.chatState);
      persistAgentMemories(state.agentMemories);
      persistCustomAgents(state.agents.filter(a => !a.isDefault));
    }
  }, [state.chatState, state.agentMemories, state.agents, state.isLoading]);

  // ─── Orchestration: process user message and schedule agent responses ─────

  const scheduleAgentResponses = useCallback(
    async (userMessage: Message) => {
      const currentState = stateRef.current;
      const { agents, agentMemories, chatState, orchestratorConfig } = currentState;

      const text = userMessage.text;
      const isPriority = orchestratorConfig.priorityInterruptEnabled && isPriorityInterrupt(text);

      // Parse addressing
      const { targetAgentIds, isSwarm } = parseAddressing(text, agents);

      // Route
      const route = routeMessage(
        text,
        agents,
        chatState.messages.slice(-20),
        isSwarm,
        targetAgentIds,
      );

      let responderIds = route.targetAgentIds;

      // Debate mode: reorder agents
      if (orchestratorConfig.debateModeEnabled && responderIds.length > 1) {
        const responders = agents.filter(a => responderIds.includes(a.id));
        const ordered = getDebateOrder(responders);
        responderIds = ordered.map(a => a.id);
      }

      // Limit simultaneous responders (unless swarm or priority)
      if (!isSwarm && !isPriority) {
        responderIds = responderIds.slice(0, orchestratorConfig.maxSimultaneousResponders);
      }

      // Create a task
      const taskId = uuidv4();
      dispatch({
        type: 'CREATE_TASK',
        payload: {
          id: taskId,
          type: route.taskType,
          description: text.slice(0, 200),
          assignedAgentIds: responderIds,
          status: 'active',
          createdAt: Date.now(),
          outputHistory: [],
          activeAgentId: responderIds[0],
        },
      });

      // Stagger responses
      const baseDelay = isPriority ? 200 : orchestratorConfig.responseDelayMs;

      for (let i = 0; i < responderIds.length; i++) {
        const agentId = responderIds[i];
        const agent = stateRef.current.agents.find(a => a.id === agentId);
        if (!agent) continue;

        const delay = baseDelay + i * baseDelay;

        // Show typing indicator
        setTimeout(() => {
          dispatch({ type: 'SET_AGENT_STATUS', payload: { id: agentId, status: 'thinking' } });
          dispatch({ type: 'SET_TYPING', payload: { agentId, isTyping: true } });
        }, delay - Math.min(delay, 400));

        // Send response after delay
        setTimeout(
          () => {
            const freshState = stateRef.current;
            const freshAgent = freshState.agents.find(a => a.id === agentId);
            if (!freshAgent || freshAgent.status === 'muted' || freshAgent.status === 'disabled') {
              dispatch({ type: 'SET_TYPING', payload: { agentId, isTyping: false } });
              return;
            }

            dispatch({ type: 'SET_AGENT_STATUS', payload: { id: agentId, status: 'responding' } });

            const mem = freshState.agentMemories[agentId] ?? makeDefaultMemory(agentId);
            const responseText = generateAgentResponse(
              freshAgent,
              text,
              freshState.chatState.messages,
              mem,
              freshState.chatState.sharedMemory,
              route.targetAgentIds,
              text,
            );

            const confidence = orchestratorConfig.confidenceScoringEnabled
              ? calculateConfidenceScore(freshAgent, detectSimpleTopic(text))
              : undefined;

            const msgId = uuidv4();
            const message: Message = {
              id: msgId,
              sender: 'agent',
              agentId: freshAgent.id,
              agentName: freshAgent.name,
              agentColor: freshAgent.color,
              agentHexColor: freshAgent.hexColor,
              text: responseText,
              timestamp: Date.now(),
              taskId,
              confidenceScore: confidence,
            };

            dispatch({ type: 'ADD_MESSAGE', payload: message });
            dispatch({ type: 'SET_TYPING', payload: { agentId, isTyping: false } });
            dispatch({ type: 'SET_AGENT_STATUS', payload: { id: agentId, status: 'idle' } });
            dispatch({
              type: 'UPDATE_AGENT',
              payload: {
                id: agentId,
                updates: {
                  lastResponseAt: Date.now(),
                  confidenceScore: confidence,
                },
              },
            });

            // Log memory entry
            dispatch({
              type: 'ADD_MEMORY_ENTRY',
              payload: {
                agentId,
                entry: {
                  id: uuidv4(),
                  agentId,
                  content: responseText.slice(0, 300),
                  timestamp: Date.now(),
                  taskId,
                  tags: [detectSimpleTopic(text)],
                },
              },
            });

            // Check for summons
            const freshAgents = stateRef.current.agents;
            const summoned = shouldSummon(freshAgent, responseText, freshAgents);
            if (summoned && orchestratorConfig.summonVisibility === 'visible') {
              const summonMsg: Message = {
                id: uuidv4(),
                sender: 'system',
                agentId: freshAgent.id,
                agentName: freshAgent.name,
                agentColor: freshAgent.color,
                agentHexColor: freshAgent.hexColor,
                text: `${freshAgent.name} is calling ${summoned.name} for assistance.`,
                timestamp: Date.now(),
                isSummon: true,
                taskId,
              };
              dispatch({ type: 'ADD_MESSAGE', payload: summonMsg });

              // Schedule summoned agent response
              const summonDelay = 600;
              setTimeout(() => {
                dispatch({ type: 'SET_TYPING', payload: { agentId: summoned.id, isTyping: true } });
                dispatch({ type: 'SET_AGENT_STATUS', payload: { id: summoned.id, status: 'thinking' } });
              }, summonDelay - 300);

              setTimeout(() => {
                const summonedFresh = stateRef.current.agents.find(a => a.id === summoned.id);
                if (!summonedFresh) return;

                const summonMem =
                  stateRef.current.agentMemories[summoned.id] ?? makeDefaultMemory(summoned.id);
                const summonResponse = generateAgentResponse(
                  summonedFresh,
                  `[Summoned by ${freshAgent.name}] ${text}`,
                  stateRef.current.chatState.messages,
                  summonMem,
                  stateRef.current.chatState.sharedMemory,
                  [summoned.id],
                  text,
                );

                const summonConf = orchestratorConfig.confidenceScoringEnabled
                  ? calculateConfidenceScore(summonedFresh, detectSimpleTopic(text))
                  : undefined;

                dispatch({
                  type: 'ADD_MESSAGE',
                  payload: {
                    id: uuidv4(),
                    sender: 'agent',
                    agentId: summoned.id,
                    agentName: summoned.name,
                    agentColor: summoned.color,
                    agentHexColor: summoned.hexColor,
                    text: summonResponse,
                    timestamp: Date.now(),
                    taskId,
                    confidenceScore: summonConf,
                    replyToId: msgId,
                  },
                });
                dispatch({ type: 'SET_TYPING', payload: { agentId: summoned.id, isTyping: false } });
                dispatch({ type: 'SET_AGENT_STATUS', payload: { id: summoned.id, status: 'idle' } });

                // Set summon cooldown
                dispatch({
                  type: 'UPDATE_AGENT',
                  payload: {
                    id: freshAgent.id,
                    updates: { cooldownUntil: Date.now() + SUMMON_COOLDOWN_MS },
                  },
                });
              }, summonDelay);
            }

            // Red logs decisions to shared memory
            if (freshAgent.role === 'alpha') {
              dispatch({
                type: 'ADD_SHARED_MEMORY',
                payload: {
                  id: uuidv4(),
                  content: responseText.slice(0, 200),
                  source: 'red_decision',
                  authorAgentId: agentId,
                  timestamp: Date.now(),
                },
              });
            }
          },
          delay,
        );
      }

      // Mark task complete after last response
      const completionDelay = baseDelay + responderIds.length * baseDelay + 500;
      setTimeout(() => {
        dispatch({ type: 'UPDATE_TASK', payload: { id: taskId, updates: { status: 'complete', completedAt: Date.now() } } });
      }, completionDelay);
    },
    [],
  );

  // ─── Public API ───────────────────────────────────────────────────────────

  const sendUserMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const message: Message = {
        id: uuidv4(),
        sender: 'user',
        text: text.trim(),
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: message });
      scheduleAgentResponses(message);
    },
    [scheduleAgentResponses],
  );

  const addCustomAgent = useCallback(
    (agentData: Omit<Agent, 'id' | 'isDefault' | 'memoryId' | 'status' | 'priority'>) => {
      const id = uuidv4();
      const agent: Agent = {
        ...agentData,
        id,
        isDefault: false,
        memoryId: `mem-${id}`,
        status: 'idle',
        priority: 55,
      };
      dispatch({ type: 'ADD_CUSTOM_AGENT', payload: agent });
    },
    [],
  );

  const updateAgent = useCallback((id: string, updates: Partial<Agent>) => {
    dispatch({ type: 'UPDATE_AGENT', payload: { id, updates } });
  }, []);

  const removeCustomAgent = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_CUSTOM_AGENT', payload: id });
  }, []);

  const muteAgent = useCallback((id: string, muted: boolean) => {
    dispatch({
      type: 'SET_AGENT_STATUS',
      payload: { id, status: muted ? 'muted' : 'idle' },
    });
  }, []);

  const disableAgent = useCallback((id: string, disabled: boolean) => {
    dispatch({
      type: 'SET_AGENT_STATUS',
      payload: { id, status: disabled ? 'disabled' : 'idle' },
    });
  }, []);

  const resetAgentMemory = useCallback((id: string) => {
    dispatch({ type: 'RESET_AGENT_MEMORY', payload: id });
  }, []);

  const clearChat = useCallback(() => {
    dispatch({ type: 'CLEAR_CHAT' });
  }, []);

  const cancelTask = useCallback((id: string) => {
    dispatch({ type: 'CANCEL_TASK', payload: id });
  }, []);

  const createFile = useCallback(
    (fileData: Omit<StoredFile, 'id' | 'createdAt' | 'updatedAt'>) => {
      const file: StoredFile = {
        ...fileData,
        id: uuidv4(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      dispatch({ type: 'CREATE_FILE', payload: file });
    },
    [],
  );

  const updateFile = useCallback((id: string, content: string) => {
    dispatch({ type: 'UPDATE_FILE', payload: { id, content } });
  }, []);

  const deleteFile = useCallback((id: string) => {
    dispatch({ type: 'DELETE_FILE', payload: id });
  }, []);

  const updateOrchestratorConfig = useCallback((updates: Partial<OrchestratorConfig>) => {
    dispatch({ type: 'UPDATE_ORCHESTRATOR_CONFIG', payload: updates });
  }, []);

  return (
    <StoreContext.Provider
      value={{
        state,
        dispatch,
        sendUserMessage,
        addCustomAgent,
        updateAgent,
        removeCustomAgent,
        muteAgent,
        disableAgent,
        resetAgentMemory,
        clearChat,
        cancelTask,
        createFile,
        updateFile,
        deleteFile,
        updateOrchestratorConfig,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectSimpleTopic(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(code|implement|build|function|class|script)\b/.test(lower)) return 'code';
  if (/\b(analyze|analyse|reason|breakdown|explain)\b/.test(lower)) return 'analysis';
  if (/\b(idea|creative|suggest|improve)\b/.test(lower)) return 'creative';
  if (/\b(plan|step|strategy|roadmap)\b/.test(lower)) return 'planning';
  if (/\b(debug|error|fix|bug)\b/.test(lower)) return 'debug';
  if (/\b(research|find|about)\b/.test(lower)) return 'research';
  return 'general';
}
