// ─── Agent Types ────────────────────────────────────────────────────────────

export type AgentColor =
  | 'Red'
  | 'Blue'
  | 'Green'
  | 'Yellow'
  | 'Purple'
  | string;

export type BehaviorStyle =
  | 'concise'
  | 'verbose'
  | 'analytical'
  | 'creative'
  | 'technical';

export type SpecializationTag =
  | 'coding'
  | 'research'
  | 'organization'
  | 'summarization'
  | 'planning'
  | 'critique';

export type AgentRole = 'alpha' | 'logic' | 'builder' | 'creative' | 'memory' | 'custom';

export type AgentStatus = 'idle' | 'thinking' | 'responding' | 'error' | 'muted' | 'disabled';

export type PersonalityType =
  | 'Commander'
  | 'Analyst'
  | 'Operator'
  | 'Visionary'
  | 'Observer'
  | 'Custom';

export interface Agent {
  id: string;
  name: string;
  color: AgentColor;
  hexColor: string;
  role: AgentRole;
  roleDescription: string;
  behaviorStyle: BehaviorStyle;
  specializationTags: SpecializationTag[];
  personalityType: PersonalityType;
  isDefault: boolean;
  priority: number;         // 0–100, higher = more likely to respond
  status: AgentStatus;
  memoryId: string;         // key into per-agent memory store
  confidenceScore?: number; // 0–1 from last response
  lastResponseAt?: number;  // timestamp
  cooldownUntil?: number;   // summon cooldown timestamp
}

// ─── Message Types ───────────────────────────────────────────────────────────

export type MessageSender = 'user' | 'agent' | 'system';

export interface Message {
  id: string;
  sender: MessageSender;
  agentId?: string;         // populated when sender === 'agent' or 'system'
  agentName?: string;
  agentColor?: AgentColor;
  agentHexColor?: string;
  text: string;
  timestamp: number;
  taskId?: string;          // associated task if any
  replyToId?: string;       // message this is replying to
  isSummon?: boolean;       // internal summon message
  confidenceScore?: number; // agent self-rated confidence
  isPartial?: boolean;      // streaming placeholder
}

// ─── Task Types ──────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'active' | 'complete' | 'failed' | 'cancelled';
export type TaskType = 'direct' | 'swarm' | 'collaborative';

export interface Task {
  id: string;
  type: TaskType;
  description: string;
  assignedAgentIds: string[];
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;
  outputHistory: string[];  // message IDs
  activeAgentId?: string;   // who is currently working on it
}

// ─── Memory Types ────────────────────────────────────────────────────────────

export interface AgentMemoryEntry {
  id: string;
  agentId: string;
  content: string;
  timestamp: number;
  taskId?: string;
  tags: string[];
}

export interface AgentMemory {
  agentId: string;
  entries: AgentMemoryEntry[];
  contextSummary: string;
  lastUpdated: number;
}

export interface SharedMemoryEntry {
  id: string;
  content: string;
  source: 'red_decision' | 'user_confirmation' | 'task_completion';
  authorAgentId: string;
  timestamp: number;
}

// ─── Storage Types ───────────────────────────────────────────────────────────

export interface StoredFile {
  id: string;
  name: string;
  content: string;
  createdBy: string;       // agent id or 'user'
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

// ─── Chat State ──────────────────────────────────────────────────────────────

export interface ChatState {
  messages: Message[];
  tasks: Task[];
  activeTaskIds: string[];
  typingAgentIds: string[];
  sharedMemory: SharedMemoryEntry[];
  storedFiles: StoredFile[];
  sessionId: string;
  createdAt: number;
}

// ─── Orchestration Types ─────────────────────────────────────────────────────

export type OrchestratorMode = 'normal' | 'debate' | 'swarm';

export interface OrchestratorConfig {
  mode: OrchestratorMode;
  maxSimultaneousResponders: number;
  summonVisibility: 'visible' | 'silent';
  responseDelayMs: number;
  confidenceScoringEnabled: boolean;
  debateModeEnabled: boolean;
  priorityInterruptEnabled: boolean;
}

export interface RouteDecision {
  targetAgentIds: string[];
  taskType: TaskType;
  requiresDebate: boolean;
  isSummon: boolean;
  summonedBy?: string;
}

// ─── App Store Types ─────────────────────────────────────────────────────────

export interface AppStore {
  agents: Agent[];
  agentMemories: Record<string, AgentMemory>;
  chatState: ChatState;
  orchestratorConfig: OrchestratorConfig;

  // Agent actions
  addCustomAgent: (agent: Omit<Agent, 'id' | 'isDefault' | 'memoryId' | 'status' | 'priority'>) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeCustomAgent: (id: string) => void;
  setAgentStatus: (id: string, status: AgentStatus) => void;
  muteAgent: (id: string, muted: boolean) => void;
  resetAgentMemory: (id: string) => void;

  // Chat actions
  sendUserMessage: (text: string) => void;
  addAgentMessage: (message: Message) => void;
  addSystemMessage: (text: string) => void;
  setTyping: (agentId: string, isTyping: boolean) => void;
  clearChat: () => void;

  // Task actions
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'outputHistory'>) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  cancelTask: (id: string) => void;

  // Memory actions
  addMemoryEntry: (agentId: string, entry: Omit<AgentMemoryEntry, 'id'>) => void;
  addSharedMemoryEntry: (entry: Omit<SharedMemoryEntry, 'id'>) => void;

  // Storage actions
  createFile: (file: Omit<StoredFile, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateFile: (id: string, content: string) => void;
  deleteFile: (id: string) => void;

  // Config actions
  updateOrchestratorConfig: (updates: Partial<OrchestratorConfig>) => void;

  // Persistence
  loadPersistedState: () => Promise<void>;
  persistState: () => Promise<void>;
}
