import { Agent, Message, RouteDecision, TaskType } from '../types';

// Patterns for @-mentions
const SWARM_PATTERN = /@swarm\b/i;
const AGENT_MENTION_PATTERN = /@(\w+)/g;

/**
 * Parses a message to determine which agents should respond.
 */
export function parseAddressing(
  text: string,
  agents: Agent[],
): { targetAgentIds: string[]; isSwarm: boolean } {
  if (SWARM_PATTERN.test(text)) {
    return {
      targetAgentIds: agents.filter(a => a.status !== 'muted' && a.status !== 'disabled').map(a => a.id),
      isSwarm: true,
    };
  }

  const mentions: string[] = [];
  let match: RegExpExecArray | null;
  AGENT_MENTION_PATTERN.lastIndex = 0;
  while ((match = AGENT_MENTION_PATTERN.exec(text)) !== null) {
    mentions.push(match[1].toLowerCase());
  }

  const targeted = agents.filter(
    a =>
      mentions.includes(a.name.toLowerCase()) &&
      a.status !== 'muted' &&
      a.status !== 'disabled',
  );

  return {
    targetAgentIds: targeted.map(a => a.id),
    isSwarm: false,
  };
}

/**
 * Determines which agents should respond to a message, considering context
 * and relevance even when not directly mentioned.
 */
export function routeMessage(
  text: string,
  agents: Agent[],
  recentMessages: Message[],
  isSwarm: boolean,
  explicitTargetIds: string[],
): RouteDecision {
  const lower = text.toLowerCase();
  const availableAgents = agents.filter(
    a => a.status !== 'muted' && a.status !== 'disabled',
  );

  if (isSwarm) {
    return {
      targetAgentIds: availableAgents.map(a => a.id),
      taskType: 'swarm',
      requiresDebate: false,
      isSummon: false,
    };
  }

  if (explicitTargetIds.length > 0) {
    // Multi-agent explicit: collaborative
    const taskType: TaskType = explicitTargetIds.length > 1 ? 'collaborative' : 'direct';
    return {
      targetAgentIds: explicitTargetIds,
      taskType,
      requiresDebate: false,
      isSummon: false,
    };
  }

  // Auto-route by context
  const scored = availableAgents
    .map(a => ({ agent: a, score: scoreAgentRelevance(a, lower, recentMessages) }))
    .sort((a, b) => b.score - a.score);

  // Top responding agents — cap at 3 for non-swarm auto-route
  const threshold = scored[0]?.score ?? 0;
  const responders = scored
    .filter(s => s.score >= Math.max(threshold * 0.6, 10))
    .slice(0, 3)
    .map(s => s.agent.id);

  return {
    targetAgentIds: responders,
    taskType: 'collaborative',
    requiresDebate: false,
    isSummon: false,
  };
}

/**
 * Scores how relevant a given agent is to a message.
 */
function scoreAgentRelevance(agent: Agent, lower: string, history: Message[]): number {
  let score = agent.priority * 0.3; // base from agent priority

  // Role-based keyword matching
  const roleKeywords: Record<string, string[]> = {
    alpha: ['decide', 'final', 'route', 'approve', 'confirm', 'direction'],
    logic: ['analyze', 'analyse', 'reason', 'logic', 'explain', 'breakdown', 'structure', 'step', 'why', 'how'],
    builder: ['build', 'code', 'implement', 'create', 'write', 'develop', 'execute', 'make', 'construct'],
    creative: ['idea', 'creative', 'improve', 'suggest', 'alternative', 'enhance', 'imagine', 'brainstorm'],
    memory: ['remember', 'previous', 'before', 'track', 'history', 'context', 'prior', 'consistent'],
  };

  const keywords = roleKeywords[agent.role] ?? [];
  for (const kw of keywords) {
    if (lower.includes(kw)) score += 20;
  }

  // Specialization tags
  const tagKeywords: Record<string, string[]> = {
    coding: ['code', 'function', 'class', 'script', 'program', 'implement'],
    research: ['research', 'find', 'search', 'information', 'about', 'explain'],
    organization: ['organize', 'plan', 'structure', 'order', 'manage'],
    summarization: ['summary', 'summarize', 'overview', 'recap', 'brief'],
    planning: ['plan', 'steps', 'roadmap', 'strategy', 'approach'],
    critique: ['review', 'evaluate', 'critique', 'feedback', 'assess'],
  };

  for (const tag of agent.specializationTags) {
    const tagKws = tagKeywords[tag] ?? [];
    for (const kw of tagKws) {
      if (lower.includes(kw)) score += 15;
    }
  }

  // Recent activity: reduce score slightly for recently-active agents
  // (spread the responses more naturally)
  if (agent.lastResponseAt) {
    const ageMs = Date.now() - agent.lastResponseAt;
    if (ageMs < 5000) score -= 10;
  }

  return score;
}

/**
 * Determines whether an agent should summon another agent to assist.
 */
export function shouldSummon(
  currentAgent: Agent,
  responseText: string,
  agents: Agent[],
): Agent | null {
  const lower = responseText.toLowerCase();
  const now = Date.now();

  // Check if current agent is referencing a need for another specialist
  const summonPatterns: { pattern: RegExp; targetRole: string }[] = [
    { pattern: /green (can|should|will|needs to|proceed|leads|builds|executes)/i, targetRole: 'builder' },
    { pattern: /blue (can|should|will|validates|owns|analyzes|confirms)/i, targetRole: 'logic' },
    { pattern: /yellow (can|should|generates|expands|suggests)/i, targetRole: 'creative' },
    { pattern: /purple (tracks|logs|monitors|should note)/i, targetRole: 'memory' },
    { pattern: /red (approves|confirms|finalizes|decides|signs off)/i, targetRole: 'alpha' },
    { pattern: /summon (green|blue|yellow|purple|red)/i, targetRole: '' },
  ];

  for (const { pattern, targetRole } of summonPatterns) {
    if (pattern.test(responseText)) {
      const target = agents.find(a => {
        if (a.id === currentAgent.id) return false;
        if (a.status === 'muted' || a.status === 'disabled') return false;
        if (a.cooldownUntil && a.cooldownUntil > now) return false;
        return targetRole ? a.role === targetRole : true;
      });
      if (target) return target;
    }
  }

  return null;
}

/**
 * Orders agents for debate mode: logical → creative → memory → alpha last
 */
export function getDebateOrder(agents: Agent[]): Agent[] {
  const roleOrder = ['logic', 'creative', 'builder', 'memory', 'alpha'];
  return [...agents].sort((a, b) => {
    const ai = roleOrder.indexOf(a.role);
    const bi = roleOrder.indexOf(b.role);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

/**
 * Detect if message is a priority interrupt (urgent language).
 */
export function isPriorityInterrupt(text: string): boolean {
  return /\b(urgent|critical|immediately|stop|halt|override|emergency|now|asap|priority)\b/i.test(text);
}
