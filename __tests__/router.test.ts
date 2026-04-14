import { parseAddressing, routeMessage, isPriorityInterrupt, getDebateOrder } from '../src/engine/router';
import { Agent, AgentStatus } from '../src/types';

function makeAgent(id: string, name: string, role: Agent['role'], priority: number = 70): Agent {
  return {
    id,
    name,
    color: name,
    hexColor: '#888888',
    role,
    roleDescription: role,
    behaviorStyle: 'concise',
    specializationTags: [],
    personalityType: 'Custom',
    isDefault: true,
    priority,
    memoryId: `mem-${id}`,
    status: 'idle' as AgentStatus,
  };
}

const agents: Agent[] = [
  makeAgent('agent-red', 'Red', 'alpha', 95),
  makeAgent('agent-blue', 'Blue', 'logic', 75),
  makeAgent('agent-green', 'Green', 'builder', 70),
  makeAgent('agent-yellow', 'Yellow', 'creative', 65),
  makeAgent('agent-purple', 'Purple', 'memory', 60),
];

// ─── parseAddressing ──────────────────────────────────────────────────────────

describe('parseAddressing', () => {
  it('returns all agents for @swarm', () => {
    const result = parseAddressing('@swarm analyze this', agents);
    expect(result.isSwarm).toBe(true);
    expect(result.targetAgentIds).toHaveLength(agents.length);
  });

  it('returns specific agent for @Blue', () => {
    const result = parseAddressing('@Blue break this down', agents);
    expect(result.isSwarm).toBe(false);
    expect(result.targetAgentIds).toEqual(['agent-blue']);
  });

  it('returns multiple agents for multiple mentions', () => {
    const result = parseAddressing('@Blue @Green build this', agents);
    expect(result.targetAgentIds).toContain('agent-blue');
    expect(result.targetAgentIds).toContain('agent-green');
    expect(result.targetAgentIds).toHaveLength(2);
  });

  it('is case-insensitive for agent names', () => {
    const result = parseAddressing('@red do this', agents);
    expect(result.targetAgentIds).toContain('agent-red');
  });

  it('excludes muted agents from @swarm', () => {
    const withMuted = agents.map(a =>
      a.name === 'Blue' ? { ...a, status: 'muted' as AgentStatus } : a,
    );
    const result = parseAddressing('@swarm test', withMuted);
    expect(result.targetAgentIds).not.toContain('agent-blue');
  });

  it('excludes disabled agents from @swarm', () => {
    const withDisabled = agents.map(a =>
      a.name === 'Green' ? { ...a, status: 'disabled' as AgentStatus } : a,
    );
    const result = parseAddressing('@swarm test', withDisabled);
    expect(result.targetAgentIds).not.toContain('agent-green');
  });

  it('returns empty targetAgentIds for unrecognized @mention', () => {
    const result = parseAddressing('@Unknown test', agents);
    expect(result.targetAgentIds).toHaveLength(0);
    expect(result.isSwarm).toBe(false);
  });
});

// ─── routeMessage ─────────────────────────────────────────────────────────────

describe('routeMessage', () => {
  it('routes to all agents for swarm', () => {
    const result = routeMessage('analyze this', agents, [], true, []);
    expect(result.taskType).toBe('swarm');
    expect(result.targetAgentIds).toHaveLength(agents.length);
  });

  it('uses explicit target IDs when provided', () => {
    const result = routeMessage('build this', agents, [], false, ['agent-green']);
    expect(result.targetAgentIds).toContain('agent-green');
    expect(result.taskType).toBe('direct');
  });

  it('uses collaborative when multiple explicit targets', () => {
    const result = routeMessage('build this', agents, [], false, ['agent-blue', 'agent-green']);
    expect(result.taskType).toBe('collaborative');
  });

  it('auto-routes code questions to builder (Green)', () => {
    const result = routeMessage('implement a function', agents, [], false, []);
    // Green should be in the responders
    expect(result.targetAgentIds).toContain('agent-green');
  });

  it('auto-routes analysis to logic (Blue)', () => {
    const result = routeMessage('analyze and breakdown this problem', agents, [], false, []);
    expect(result.targetAgentIds).toContain('agent-blue');
  });

  it('limits auto-route to max 3 responders', () => {
    const result = routeMessage('general question', agents, [], false, []);
    expect(result.targetAgentIds.length).toBeLessThanOrEqual(3);
  });
});

// ─── isPriorityInterrupt ──────────────────────────────────────────────────────

describe('isPriorityInterrupt', () => {
  it('detects urgent messages', () => {
    expect(isPriorityInterrupt('This is URGENT please help')).toBe(true);
    expect(isPriorityInterrupt('STOP what you are doing')).toBe(true);
    expect(isPriorityInterrupt('critical issue found')).toBe(true);
    expect(isPriorityInterrupt('do this ASAP')).toBe(true);
    expect(isPriorityInterrupt('HALT the process')).toBe(true);
  });

  it('does not flag normal messages', () => {
    expect(isPriorityInterrupt('please analyze this')).toBe(false);
    expect(isPriorityInterrupt('build a function')).toBe(false);
    expect(isPriorityInterrupt('@Blue explain this')).toBe(false);
  });
});

// ─── getDebateOrder ───────────────────────────────────────────────────────────

describe('getDebateOrder', () => {
  it('orders agents with logic first and alpha last', () => {
    const subset = agents.filter(a =>
      ['agent-red', 'agent-blue', 'agent-yellow'].includes(a.id),
    );
    const ordered = getDebateOrder(subset);
    expect(ordered[0].role).toBe('logic');    // Blue first
    expect(ordered[ordered.length - 1].role).toBe('alpha'); // Red last
  });

  it('handles single agent', () => {
    const single = [agents[0]];
    const result = getDebateOrder(single);
    expect(result).toHaveLength(1);
  });

  it('handles empty array', () => {
    expect(getDebateOrder([])).toHaveLength(0);
  });
});
