import { generateAgentResponse, calculateConfidenceScore } from '../src/engine/responseGenerator';
import { Agent, AgentMemory, AgentStatus } from '../src/types';

function makeAgent(id: string, role: Agent['role'], personalityType: Agent['personalityType']): Agent {
  return {
    id,
    name: role.charAt(0).toUpperCase() + role.slice(1),
    color: role,
    hexColor: '#888',
    role,
    roleDescription: role,
    behaviorStyle: 'concise',
    specializationTags: [],
    personalityType,
    isDefault: true,
    priority: 70,
    memoryId: `mem-${id}`,
    status: 'idle' as AgentStatus,
  };
}

const emptyMemory = (agentId: string): AgentMemory => ({
  agentId,
  entries: [],
  contextSummary: '',
  lastUpdated: Date.now(),
});

const redAgent = makeAgent('agent-red', 'alpha', 'Commander');
const blueAgent = makeAgent('agent-blue', 'logic', 'Analyst');
const greenAgent = makeAgent('agent-green', 'builder', 'Operator');
const yellowAgent = makeAgent('agent-yellow', 'creative', 'Visionary');
const purpleAgent = makeAgent('agent-purple', 'memory', 'Observer');

describe('generateAgentResponse', () => {
  it('returns a non-empty string for Red (Commander)', () => {
    const result = generateAgentResponse(
      redAgent,
      '@Red build a plan',
      [],
      emptyMemory('agent-red'),
      [],
      ['agent-red'],
    );
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns structured breakdown for Blue (Analyst)', () => {
    const result = generateAgentResponse(
      blueAgent,
      '@Blue analyze this problem',
      [],
      emptyMemory('agent-blue'),
      [],
      ['agent-blue'],
    );
    expect(result).toBeTruthy();
    // Blue should have structured content
    expect(result.length).toBeGreaterThan(20);
  });

  it('returns code or execution output for Green (Operator) on code task', () => {
    const result = generateAgentResponse(
      greenAgent,
      '@Green implement a function',
      [],
      emptyMemory('agent-green'),
      [],
      ['agent-green'],
    );
    expect(result).toBeTruthy();
    // Green responds to code tasks
    expect(result.length).toBeGreaterThan(20);
  });

  it('returns expansive/creative response for Yellow (Visionary)', () => {
    const result = generateAgentResponse(
      yellowAgent,
      '@Yellow give me ideas',
      [],
      emptyMemory('agent-yellow'),
      [],
      ['agent-yellow'],
    );
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(20);
  });

  it('returns context-aware response for Purple (Observer)', () => {
    const result = generateAgentResponse(
      purpleAgent,
      'What has been decided?',
      [],
      emptyMemory('agent-purple'),
      [],
      ['agent-purple'],
    );
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles empty message without throwing', () => {
    expect(() =>
      generateAgentResponse(blueAgent, '', [], emptyMemory('agent-blue'), [], []),
    ).not.toThrow();
  });

  it('handles very long message without throwing', () => {
    const longMsg = 'word '.repeat(500);
    expect(() =>
      generateAgentResponse(blueAgent, longMsg, [], emptyMemory('agent-blue'), [], []),
    ).not.toThrow();
  });

  it('uses shared memory context for Purple when available', () => {
    const sharedMemory = [{
      id: 'sm-1',
      content: 'Red decided to proceed with option A',
      source: 'red_decision' as const,
      authorAgentId: 'agent-red',
      timestamp: Date.now(),
    }];
    const result = generateAgentResponse(
      purpleAgent,
      'What should we do?',
      [],
      emptyMemory('agent-purple'),
      sharedMemory,
      ['agent-purple'],
    );
    expect(result).toBeTruthy();
    // Should reference the shared memory
    expect(result.toLowerCase()).toMatch(/decision|context|shared|memory|logged/);
  });
});

// ─── calculateConfidenceScore ─────────────────────────────────────────────────

describe('calculateConfidenceScore', () => {
  it('returns a number between 0 and 1', () => {
    for (let i = 0; i < 20; i++) {
      const score = calculateConfidenceScore(blueAgent, 'analysis');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('returns higher confidence for matching role-topic', () => {
    // Run multiple times due to jitter and take the average
    const scores: number[] = [];
    for (let i = 0; i < 30; i++) {
      scores.push(calculateConfidenceScore(blueAgent, 'analysis'));
    }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    expect(avg).toBeGreaterThan(0.6); // Blue is strong at analysis
  });

  it('returns lower confidence for mismatched role-topic', () => {
    const scores: number[] = [];
    for (let i = 0; i < 30; i++) {
      scores.push(calculateConfidenceScore(blueAgent, 'creative'));
    }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    expect(avg).toBeLessThan(0.8); // Blue is weaker at creative
  });

  it('handles unknown topic gracefully', () => {
    expect(() => calculateConfidenceScore(blueAgent, 'unknown_topic')).not.toThrow();
  });
});
