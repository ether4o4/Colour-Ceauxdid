import AsyncStorage from '@react-native-async-storage/async-storage';
import { SwarmAgent, SwarmMessage, Task, Workflow, AgentMemoryEntry, Project, SavedChat, ExternalAsset, ApiConfig } from '../types';
import { DEFAULT_AGENTS } from '../agents/config';

const KEYS = {
  MESSAGES: 'cc_messages',
  TASKS: 'cc_tasks',
  WORKFLOWS: 'cc_workflows',
  CUSTOM_AGENTS: 'cc_custom_agents',
  AGENT_MEMORY: 'cc_agent_memory',
  COMMAND_MEMORY: 'cc_command_memory',
  SETTINGS: 'cc_settings',
  PROJECTS: 'cc_projects',
  SAVED_CHATS: 'cc_saved_chats',
  EXTERNAL_ASSETS: 'cc_external_assets',
  ACTIVE_PROJECT: 'cc_active_project',
  API_CONFIG: 'cc_api_config',
};

// Per-thread message storage. threadKey examples:
//   'project_<id>'  group chat for a project
//   'agent_<id>'    1:1 chat with a single agent
//   undefined       legacy/global thread (kept for back-compat)
function messagesKey(threadKey?: string): string {
  return threadKey ? `${KEYS.MESSAGES}_${threadKey}` : KEYS.MESSAGES;
}

export async function getMessages(threadKey?: string): Promise<SwarmMessage[]> {
  const raw = await AsyncStorage.getItem(messagesKey(threadKey));
  return raw ? JSON.parse(raw) : [];
}

export async function saveMessage(msg: SwarmMessage, threadKey?: string): Promise<void> {
  const key = messagesKey(threadKey);
  const raw = await AsyncStorage.getItem(key);
  const msgs: SwarmMessage[] = raw ? JSON.parse(raw) : [];
  msgs.push(msg);
  const trimmed = msgs.slice(-500);
  await AsyncStorage.setItem(key, JSON.stringify(trimmed));
}

export async function clearMessages(threadKey?: string): Promise<void> {
  await AsyncStorage.removeItem(messagesKey(threadKey));
}

export async function clearAllMessages(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const msgKeys = allKeys.filter(k => k === KEYS.MESSAGES || k.startsWith(`${KEYS.MESSAGES}_`));
  if (msgKeys.length) await AsyncStorage.multiRemove(msgKeys);
}

// Tasks
export async function getTasks(): Promise<Task[]> {
  const raw = await AsyncStorage.getItem(KEYS.TASKS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveTask(task: Task): Promise<void> {
  const tasks = await getTasks();
  const idx = tasks.findIndex(t => t.id === task.id);
  if (idx >= 0) tasks[idx] = task;
  else tasks.push(task);
  await AsyncStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
}

export async function deleteTask(id: string): Promise<void> {
  const tasks = await getTasks();
  await AsyncStorage.setItem(KEYS.TASKS, JSON.stringify(tasks.filter(t => t.id !== id)));
}

// Custom agents
export async function getCustomAgents(): Promise<SwarmAgent[]> {
  const raw = await AsyncStorage.getItem(KEYS.CUSTOM_AGENTS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveCustomAgent(agent: SwarmAgent): Promise<void> {
  const agents = await getCustomAgents();
  const idx = agents.findIndex(a => a.id === agent.id);
  if (idx >= 0) agents[idx] = agent;
  else agents.push(agent);
  await AsyncStorage.setItem(KEYS.CUSTOM_AGENTS, JSON.stringify(agents));
}

export async function deleteCustomAgent(id: string): Promise<void> {
  const agents = await getCustomAgents();
  await AsyncStorage.setItem(KEYS.CUSTOM_AGENTS, JSON.stringify(agents.filter(a => a.id !== id)));
}

// Agent memory
export async function getAgentMemory(agentId: string): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(`${KEYS.AGENT_MEMORY}_${agentId}`);
  return raw ? JSON.parse(raw) : {};
}

export async function setAgentMemory(agentId: string, key: string, value: string): Promise<void> {
  const mem = await getAgentMemory(agentId);
  mem[key] = value;
  await AsyncStorage.setItem(`${KEYS.AGENT_MEMORY}_${agentId}`, JSON.stringify(mem));
}

// Workflows
export async function getWorkflows(): Promise<Workflow[]> {
  const raw = await AsyncStorage.getItem(KEYS.WORKFLOWS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveWorkflow(workflow: Workflow): Promise<void> {
  const workflows = await getWorkflows();
  const idx = workflows.findIndex(w => w.id === workflow.id);
  if (idx >= 0) workflows[idx] = workflow;
  else workflows.push(workflow);
  await AsyncStorage.setItem(KEYS.WORKFLOWS, JSON.stringify(workflows));
}

export async function deleteWorkflow(id: string): Promise<void> {
  const workflows = await getWorkflows();
  await AsyncStorage.setItem(KEYS.WORKFLOWS, JSON.stringify(workflows.filter(w => w.id !== id)));
}

// Command memory / user preferences
export async function getCommandMemory(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(KEYS.COMMAND_MEMORY);
  return raw ? JSON.parse(raw) : {};
}

export async function setCommandMemory(key: string, value: string): Promise<void> {
  const mem = await getCommandMemory();
  mem[key] = value;
  await AsyncStorage.setItem(KEYS.COMMAND_MEMORY, JSON.stringify(mem));
}

// Settings
export async function getSettings(): Promise<Record<string, any>> {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  return raw ? JSON.parse(raw) : { silentMode: false, focusedAgents: [], theme: 'dark' };
}

export async function updateSettings(updates: Record<string, any>): Promise<void> {
  const settings = await getSettings();
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...settings, ...updates }));
}

// Projects
export async function getProjects(): Promise<Project[]> {
  const raw = await AsyncStorage.getItem(KEYS.PROJECTS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveProject(project: Project): Promise<void> {
  const projects = await getProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) projects[idx] = project;
  else projects.push(project);
  await AsyncStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await getProjects();
  await AsyncStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects.filter(p => p.id !== id)));
}

// Active Project
export async function getActiveProjectId(): Promise<string | null> {
  return await AsyncStorage.getItem(KEYS.ACTIVE_PROJECT);
}

export async function setActiveProjectId(projectId: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACTIVE_PROJECT, projectId);
}

// Saved Chats
export async function getSavedChats(): Promise<SavedChat[]> {
  const raw = await AsyncStorage.getItem(KEYS.SAVED_CHATS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveChatSession(chat: SavedChat): Promise<void> {
  const chats = await getSavedChats();
  const idx = chats.findIndex(c => c.id === chat.id);
  if (idx >= 0) chats[idx] = chat;
  else chats.push(chat);
  await AsyncStorage.setItem(KEYS.SAVED_CHATS, JSON.stringify(chats));
}

export async function deleteSavedChat(id: string): Promise<void> {
  const chats = await getSavedChats();
  await AsyncStorage.setItem(KEYS.SAVED_CHATS, JSON.stringify(chats.filter(c => c.id !== id)));
}

// External Assets
export async function getExternalAssets(): Promise<ExternalAsset[]> {
  const raw = await AsyncStorage.getItem(KEYS.EXTERNAL_ASSETS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveExternalAsset(asset: ExternalAsset): Promise<void> {
  const assets = await getExternalAssets();
  const idx = assets.findIndex(a => a.id === asset.id);
  if (idx >= 0) assets[idx] = asset;
  else assets.push(asset);
  await AsyncStorage.setItem(KEYS.EXTERNAL_ASSETS, JSON.stringify(assets));
}

export async function deleteExternalAsset(id: string): Promise<void> {
  const assets = await getExternalAssets();
  await AsyncStorage.setItem(KEYS.EXTERNAL_ASSETS, JSON.stringify(assets.filter(a => a.id !== id)));
}

// API Config (provider, key, base URL, model)
const DEFAULT_API_CONFIG: ApiConfig = {
  provider: 'openrouter',
  apiKey: '',
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'meta-llama/llama-3.1-8b-instruct:free',
};

export async function getApiConfig(): Promise<ApiConfig> {
  const raw = await AsyncStorage.getItem(KEYS.API_CONFIG);
  if (!raw) return { ...DEFAULT_API_CONFIG };
  try {
    return { ...DEFAULT_API_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_API_CONFIG };
  }
}

export async function updateApiConfig(updates: Partial<ApiConfig>): Promise<ApiConfig> {
  const current = await getApiConfig();
  const next = { ...current, ...updates };
  await AsyncStorage.setItem(KEYS.API_CONFIG, JSON.stringify(next));
  return next;
}

// Alias used by the dropdown SettingsScreen — accepts a full object and saves directly.
export async function saveApiConfig(config: { provider: string; apiKey: string; baseUrl: string; model: string }): Promise<void> {
  const cfg: ApiConfig = {
    provider: (config.provider || 'openrouter') as ApiConfig['provider'],
    apiKey: config.apiKey || '',
    baseUrl: config.baseUrl || 'https://openrouter.ai/api/v1',
    model: config.model || 'meta-llama/llama-3.1-8b-instruct:free',
  };
  await AsyncStorage.setItem(KEYS.API_CONFIG, JSON.stringify(cfg));
}

// Swarm config — silentMode + focusedAgents, stored inside cc_settings.
export async function getSwarmConfig(): Promise<{ silentMode: boolean; focusedAgents: string[] }> {
  const settings = await getSettings();
  return {
    silentMode: settings.silentMode || false,
    focusedAgents: settings.focusedAgents || [],
  };
}

export async function saveSwarmConfig(config: { silentMode?: boolean; focusedAgents?: string[] }): Promise<void> {
  await updateSettings(config);
}
