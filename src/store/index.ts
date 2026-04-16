import AsyncStorage from '@react-native-async-storage/async-storage';
import { SwarmAgent, SwarmMessage, Task, Workflow, AgentMemoryEntry, Project, SavedChat, ExternalAsset } from '../types';
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
};

// Messages
export async function getMessages(): Promise<SwarmMessage[]> {
  const raw = await AsyncStorage.getItem(KEYS.MESSAGES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveMessage(msg: SwarmMessage): Promise<void> {
  const msgs = await getMessages();
  msgs.push(msg);
  // Keep last 500 messages
  const trimmed = msgs.slice(-500);
  await AsyncStorage.setItem(KEYS.MESSAGES, JSON.stringify(trimmed));
}

export async function clearMessages(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.MESSAGES);
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
