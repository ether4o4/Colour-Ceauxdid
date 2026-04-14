import { Agent, Message, AgentMemory, SharedMemoryEntry } from '../types';

/**
 * Generates a contextually-appropriate response for an agent based on its
 * personality, role, the incoming message, and conversation history.
 */
export function generateAgentResponse(
  agent: Agent,
  userMessage: string,
  conversationHistory: Message[],
  agentMemory: AgentMemory,
  sharedMemory: SharedMemoryEntry[],
  targetedAgentIds: string[],
  taskDescription?: string,
): string {
  const isDirectlyTargeted = targetedAgentIds.includes(agent.id);
  const lower = userMessage.toLowerCase();

  // Determine dominant topic
  const topic = detectTopic(lower);

  // Build response based on personality type
  switch (agent.personalityType) {
    case 'Commander':
      return generateRedResponse(userMessage, lower, topic, conversationHistory, isDirectlyTargeted);
    case 'Analyst':
      return generateBlueResponse(userMessage, lower, topic, conversationHistory);
    case 'Operator':
      return generateGreenResponse(userMessage, lower, topic, conversationHistory);
    case 'Visionary':
      return generateYellowResponse(userMessage, lower, topic, conversationHistory);
    case 'Observer':
      return generatePurpleResponse(userMessage, lower, topic, conversationHistory, sharedMemory);
    default:
      return generateCustomResponse(agent, userMessage, lower, topic, conversationHistory);
  }
}

// ─── Topic Detection ─────────────────────────────────────────────────────────

type Topic =
  | 'code'
  | 'analysis'
  | 'creative'
  | 'planning'
  | 'question'
  | 'task'
  | 'debug'
  | 'research'
  | 'review'
  | 'general';

function detectTopic(lower: string): Topic {
  if (/\b(code|function|class|bug|implement|write|build|create|develop|script|program)\b/.test(lower)) return 'code';
  if (/\b(debug|error|fix|issue|problem|broken|crash|fail)\b/.test(lower)) return 'debug';
  if (/\b(analyze|analyse|break.?down|explain|understand|reason|logic|why|how)\b/.test(lower)) return 'analysis';
  if (/\b(idea|creative|imagine|think|suggest|improve|enhance|alternative)\b/.test(lower)) return 'creative';
  if (/\b(plan|step|approach|strategy|roadmap|process|workflow|organize)\b/.test(lower)) return 'planning';
  if (/\b(research|find|search|look.?up|information|learn|about)\b/.test(lower)) return 'research';
  if (/\b(review|check|evaluate|assess|judge|feedback|critique)\b/.test(lower)) return 'review';
  if (/\b(task|do|complete|finish|execute|perform|run)\b/.test(lower)) return 'task';
  if (/\?/.test(lower)) return 'question';
  return 'general';
}

// ─── Red (Commander) ─────────────────────────────────────────────────────────

function generateRedResponse(
  message: string,
  lower: string,
  topic: Topic,
  history: Message[],
  direct: boolean,
): string {
  const recentAgentMessages = history.filter(m => m.sender === 'agent').slice(-6);

  if (topic === 'planning' || topic === 'task') {
    const steps = extractKeyTerms(lower);
    return `Confirmed. Priority assignment:\n\n${steps.length > 0 ? steps.map((s, i) => `${i + 1}. ${capitalize(s)}`).join('\n') : '1. Blue — analysis\n2. Green — execution\n3. Yellow — alternatives'}\n\nProceed.`;
  }

  if (recentAgentMessages.length >= 3 && topic !== 'general') {
    return `Enough input collected. Direction set: proceed with the structured approach. No further expansion needed unless task scope changes.`;
  }

  if (topic === 'debug') {
    return `Route to Blue for root cause analysis. Green executes fix after diagnosis. Purple tracks the resolution for continuity.`;
  }

  if (topic === 'code') {
    return `Green leads. Blue validates logic before output. Deliver.`;
  }

  if (topic === 'creative') {
    return `Yellow generates options. I will finalize direction after evaluation.`;
  }

  if (topic === 'analysis') {
    return `Blue owns this. Stand by for breakdown.`;
  }

  if (direct) {
    return `Acknowledged. Processing your request — agents are routing now.`;
  }

  return `Routing task. Agents assigned. Stand by.`;
}

// ─── Blue (Analyst) ──────────────────────────────────────────────────────────

function generateBlueResponse(
  message: string,
  lower: string,
  topic: Topic,
  history: Message[],
): string {
  const terms = extractKeyTerms(lower);

  if (topic === 'analysis' || topic === 'question') {
    return `Breaking this down:\n\n**Inputs identified:**\n${terms.slice(0, 3).map(t => `• ${capitalize(t)}`).join('\n') || '• Primary task objective'}\n\n**Reasoning chain:**\n1. Define scope and constraints\n2. Identify dependencies\n3. Map logical relationships\n4. Derive structured output\n\n**Conclusion:** The task requires sequential processing before execution. Green can proceed once scope is confirmed.`;
  }

  if (topic === 'debug') {
    return `**Debug Analysis:**\n\n1. Isolate the failure point — identify which component produces the incorrect state\n2. Trace inputs → expected output → actual output\n3. Check for edge cases or incorrect assumptions\n4. Verify environmental factors (dependencies, versions, config)\n\nSummon Green once root cause is confirmed.`;
  }

  if (topic === 'code') {
    return `**Technical Assessment:**\n\n• Architecture: define data flow before implementation\n• Inputs/outputs: explicitly typed\n• Error handling: required at boundaries\n• Complexity: ${terms.length > 2 ? 'moderate — break into sub-tasks' : 'low — single pass execution'}\n\nGreen can build. I will validate logic post-output.`;
  }

  if (topic === 'planning') {
    return `**Structural Breakdown:**\n\n1. Define end goal (what does success look like?)\n2. Identify blockers and dependencies\n3. Sequence steps by logical priority\n4. Assign each step to the appropriate agent\n\nThis ensures no step is skipped and execution remains traceable.`;
  }

  if (topic === 'research') {
    return `**Research Framework:**\n\n• Source criteria: credibility, recency, relevance\n• Key variables: ${terms.slice(0, 2).map(capitalize).join(', ') || 'primary objective'}\n• Method: comparison across multiple angles before synthesis\n\nI can continue breaking this down or hand to Yellow for ideation.`;
  }

  return `**Analysis:**\n\nInput parsed. Key components: ${terms.slice(0, 3).map(capitalize).join(', ') || 'task objective'}.\n\nRequires structured evaluation before proceeding. Step-by-step approach recommended.`;
}

// ─── Green (Operator) ────────────────────────────────────────────────────────

function generateGreenResponse(
  message: string,
  lower: string,
  topic: Topic,
  history: Message[],
): string {
  const terms = extractKeyTerms(lower);
  const target = terms[0] ? capitalize(terms[0]) : 'component';

  if (topic === 'code') {
    return `\`\`\`typescript
// ${target} implementation
function ${toCamelCase(terms[0] || 'execute')}(input: unknown): void {
  // 1. Validate input
  if (!input) throw new Error('Invalid input');

  // 2. Process
  const result = process(input);

  // 3. Return structured output
  return result;
}

function process(data: unknown) {
  // Implementation logic here
  return data;
}
\`\`\`\n\nDeployed. Validate logic with Blue if needed.`;
  }

  if (topic === 'planning') {
    return `**Execution Plan:**\n\n\`\`\`\nSTEP 1: Setup environment\nSTEP 2: Initialize ${target}\nSTEP 3: Configure dependencies\nSTEP 4: Run primary logic\nSTEP 5: Validate output\nSTEP 6: Deliver result\n\`\`\`\n\nReady to execute on your signal.`;
  }

  if (topic === 'debug') {
    return `**Fix Applied:**\n\n1. Identified failing state\n2. Patched boundary condition\n3. Added input validation\n4. Verified expected output\n\nOutput is clean. Purple — log the resolution.`;
  }

  if (topic === 'task' || topic === 'general') {
    return `Task received. Executing:\n\n• Scope: ${terms.slice(0, 2).map(capitalize).join(', ') || 'primary objective'}\n• Method: direct implementation\n• Output: structured and ready for review\n\nDone.`;
  }

  return `Executing. Output:\n\n• ${capitalize(terms[0] || 'Task')} — complete\n• ${capitalize(terms[1] || 'Secondary step')} — delivered\n\nCall Blue for validation or Red for sign-off.`;
}

// ─── Yellow (Visionary) ──────────────────────────────────────────────────────

function generateYellowResponse(
  message: string,
  lower: string,
  topic: Topic,
  history: Message[],
): string {
  const terms = extractKeyTerms(lower);
  const subject = terms[0] ? capitalize(terms[0]) : 'this idea';

  if (topic === 'creative' || topic === 'general') {
    return `Oh, this is interesting! What if we approached ${subject} from a few angles?\n\n💡 **Angle 1:** Expand the core concept — what if it also did X and Y?\n🔄 **Angle 2:** Flip it — instead of solving the problem directly, reframe the problem itself\n🚀 **Angle 3:** Scale it — design as if 10x the scope existed from day one\n🎯 **Angle 4:** Simplify — strip to the essential truth and rebuild from there\n\nWhich direction resonates? I can develop any of these further.`;
  }

  if (topic === 'planning') {
    return `Love the planning energy! Here are some variations:\n\n• **Minimal path:** Do less, faster — what's the 20% that delivers 80% of value?\n• **Adaptive path:** Build in phases with checkpoints — iterate based on results\n• **Moonshot path:** Assume unlimited resources — what's the ultimate version?\n\nRed can pick a direction and I'll stop expanding 😄`;
  }

  if (topic === 'code') {
    return `Before Green locks in the implementation, a few thoughts:\n\n• Could this be a reusable module instead of a one-off?\n• What if we added a plugin architecture for future extensibility?\n• Have we considered an event-driven approach instead of direct calls?\n• What does the user experience of this code look like to the caller?\n\nThese might not all apply — but worth a quick check before building.`;
  }

  if (topic === 'research') {
    return `Research rabbit holes to explore:\n\n• What's the contrarian take on this topic?\n• Who is doing this differently, and why?\n• What would change if the opposite assumption were true?\n• Are there adjacent fields with solved versions of this problem?\n\nI can go deep on any of these if useful.`;
  }

  return `Thinking expansively about "${message.slice(0, 50)}${message.length > 50 ? '…' : ''}":\n\n• What's the unexpected angle nobody is considering?\n• What would make this 10x more impactful?\n• What constraints could we remove to unlock new possibilities?\n\nLet me know if you want me to develop any direction further!`;
}

// ─── Purple (Observer) ───────────────────────────────────────────────────────

function generatePurpleResponse(
  message: string,
  lower: string,
  topic: Topic,
  history: Message[],
  sharedMemory: SharedMemoryEntry[],
): string {
  const recentMessages = history.slice(-10);
  const agentResponses = recentMessages.filter(m => m.sender === 'agent');
  const uniqueAgents = [...new Set(agentResponses.map(m => m.agentName).filter(Boolean))];

  if (sharedMemory.length > 0 && (topic === 'general' || topic === 'question')) {
    const lastDecision = sharedMemory[sharedMemory.length - 1];
    return `Context note: a relevant decision was logged in shared memory — "${lastDecision.content.slice(0, 80)}..."\n\nEnsure current work aligns with that direction before proceeding.`;
  }

  if (uniqueAgents.length >= 3) {
    const agentList = uniqueAgents.join(', ');
    return `Tracking: ${agentList} have contributed to this thread. Current context is consistent — no contradictions detected. Continuing.`;
  }

  if (topic === 'debug') {
    return `Memory reference: checking for prior instances of this issue in session history...\n\nNo contradictions found with previous resolutions. Green's fix approach is consistent with prior patterns. Logging this resolution.`;
  }

  if (topic === 'planning') {
    const priorTasks = recentMessages.filter(m => m.text.toLowerCase().includes('plan') || m.text.toLowerCase().includes('step'));
    if (priorTasks.length > 0) {
      return `Context note: a planning discussion was initiated ${Math.floor((Date.now() - priorTasks[0].timestamp) / 60000)} min ago in this session. Ensure the current plan extends rather than replaces that prior work.`;
    }
  }

  if (history.length === 0) {
    return `Session initialized. I will monitor this conversation for consistency and surface relevant context as needed.`;
  }

  return `Monitoring. ${agentResponses.length} agent response${agentResponses.length !== 1 ? 's' : ''} logged this session. No contradictions detected. I will intervene if inconsistencies arise.`;
}

// ─── Custom Agent ─────────────────────────────────────────────────────────────

function generateCustomResponse(
  agent: Agent,
  message: string,
  lower: string,
  topic: Topic,
  history: Message[],
): string {
  const terms = extractKeyTerms(lower);

  switch (agent.behaviorStyle) {
    case 'analytical':
      return `**${agent.name} — ${agent.roleDescription}:**\n\nAnalyzing: ${terms.slice(0, 3).map(capitalize).join(', ') || 'input received'}.\n\nBreaking down systematically before responding. ${topic === 'code' ? 'Technical implementation follows.' : 'Structured output prepared.'}`;

    case 'creative':
      return `${agent.name} here! Thinking about "${message.slice(0, 40)}${message.length > 40 ? '…' : ''}" from my perspective as ${agent.roleDescription}.\n\nHere's an alternative take: ${terms.length > 0 ? `What if we centered on ${terms[0]} differently?` : 'What if we approached this from an entirely unexpected angle?'}`;

    case 'technical':
      return `[${agent.name}]\n\nTechnical assessment complete.\n\n• Scope: ${terms.slice(0, 2).map(capitalize).join(', ') || 'defined'}\n• Approach: ${topic === 'code' ? 'implementation-first' : 'systematic execution'}\n• Output: ready for delivery\n\nProceed?`;

    case 'verbose':
      return `${agent.name} responding to your message. As the ${agent.roleDescription}, I want to provide comprehensive coverage of this topic.\n\nFirst, let me acknowledge the key elements: ${terms.map(capitalize).join(', ') || 'the core task'}. From my specialization in ${agent.specializationTags.join(' and ')}, I can offer the following perspective:\n\nThis requires careful attention to detail, thorough evaluation of options, and a commitment to delivering complete, well-structured output. I will ensure nothing is missed and every aspect is properly addressed.\n\nPlease let me know if you want me to elaborate on any specific aspect.`;

    case 'concise':
    default:
      return `${agent.name}: ${terms.length > 0 ? `Handling ${terms[0]}. Done.` : 'Processed. Complete.'}`;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function extractKeyTerms(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'they', 'them',
    'please', 'just', 'also', 'very', 'so', 'how', 'what', 'when', 'where',
    'who', 'which', 'why', 'all', 'any', 'some', 'no', 'not', 'up', 'out',
  ]);

  return text
    .replace(/[@#!?,.:;'"()\[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
    .slice(0, 6);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toCamelCase(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w.toLowerCase() : capitalize(w)))
    .join('');
}

/**
 * Calculates a confidence score (0–1) for an agent's response based on
 * how well its specialization matches the task topic.
 */
export function calculateConfidenceScore(agent: Agent, topic: string): number {
  const roleTopicMap: Record<string, string[]> = {
    alpha: ['planning', 'task', 'general'],
    logic: ['analysis', 'question', 'debug', 'research'],
    builder: ['code', 'task', 'debug'],
    creative: ['creative', 'research', 'planning'],
    memory: ['review', 'general', 'question'],
  };

  const strongTopics = roleTopicMap[agent.role] ?? [];
  const base = strongTopics.includes(topic) ? 0.85 : 0.5;
  // Add slight randomness ±0.1
  const jitter = (Math.random() - 0.5) * 0.2;
  return Math.min(1, Math.max(0.2, base + jitter));
}
