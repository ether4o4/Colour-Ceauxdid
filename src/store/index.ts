import AsyncStorage from '@react-native-async-storage/async-storage';
import { SwarmAgent, SwarmMessage, Task, Workflow, AgentMemoryEntry } from '../types';
import { DEFAULT_AGENTS } from '../agents/config';

const KEYS = {
  MESSAGES: 'cc_messages',
  TASKS: 'cc_tasks',
  WORKFLOWS: 'cc_workflows',
  CUSTOM_AGENTS: 'cc_custom_agents',
  AGENT_MEMORY: 'cc_agent_memory',
  COMMAND_MEMORY: 'cc_command_memory',
  SETTINGS: 'cc_settings',
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
