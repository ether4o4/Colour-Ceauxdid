/**
 * Slash-command parser.
 *
 * Slash commands are typed as the first token of a message:
 *   /plan <text>       → Red
 *   /code <text>       → Green
 *   /brainstorm <text> → Yellow
 *   /factcheck <text>  → Blue
 *   /remember <text>   → Purple (and pins a memory automatically)
 *   /toxiclaw <text>   → ToxicLaw
 *   /ask <color> <text>→ force route to that color
 *   /swarm <text>      → everyone
 *
 * Returns null for plain messages so the default routing takes over.
 */

export interface ParsedCommand {
  stripped: string;        // message with the command prefix removed
  targetAgentIds: string[];
  pin?: boolean;           // if true, also add a pinned memory from this message
}

export type ParsedRedToolCommand =
  | { kind: 'shell'; input: string }
  | { kind: 'scrape'; input: string };

const MAP: Record<string, string> = {
  plan: 'red',
  decide: 'red',
  code: 'green',
  build: 'green',
  execute: 'green',
  brainstorm: 'yellow',
  idea: 'yellow',
  expand: 'yellow',
  factcheck: 'blue',
  analyze: 'blue',
  reason: 'blue',
  remember: 'purple',
  memory: 'purple',
  toxiclaw: 'toxiclaw',
  law: 'toxiclaw',
  legal: 'toxiclaw',
};

const CORE_COMMAND_AGENT_IDS = ['red', 'blue', 'green', 'yellow', 'purple', 'toxiclaw'];

// Handle '/ask red ...' and '/swarm ...' as special cases.
export function parseSlashCommand(text: string): ParsedCommand | null {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('/')) return null;
  const firstSpace = trimmed.indexOf(' ');
  const head = (firstSpace === -1 ? trimmed.slice(1) : trimmed.slice(1, firstSpace)).toLowerCase();
  const tail = firstSpace === -1 ? '' : trimmed.slice(firstSpace + 1).trim();

  if (head === 'swarm') {
    return { stripped: tail || 'Open discussion.', targetAgentIds: CORE_COMMAND_AGENT_IDS };
  }
  if (head === 'ask') {
    const m = tail.match(/^(\w+)\s*(.*)$/);
    if (m) {
      const color = m[1].toLowerCase();
      const rest = m[2].trim() || 'Your thoughts?';
      if (CORE_COMMAND_AGENT_IDS.includes(color)) {
        return { stripped: rest, targetAgentIds: [color] };
      }
    }
    return null;
  }
  const target = MAP[head];
  if (!target) return null;
  return {
    stripped: tail || 'No input provided.',
    targetAgentIds: [target],
    pin: head === 'remember' || head === 'memory',
  };
}

export function parseRedToolCommand(text: string): ParsedRedToolCommand | null {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('/')) return null;
  const firstSpace = trimmed.indexOf(' ');
  const head = (firstSpace === -1 ? trimmed.slice(1) : trimmed.slice(1, firstSpace)).toLowerCase();
  const tail = firstSpace === -1 ? '' : trimmed.slice(firstSpace + 1).trim();
  if (!tail) return null;
  if (head === 'shell' || head === 'redshell') return { kind: 'shell', input: tail };
  if (head === 'scrape' || head === 'redscrape') return { kind: 'scrape', input: tail };
  return null;
}

export const SLASH_COMMANDS_HELP = [
  { cmd: '/plan', desc: 'Red plans it', color: '#ff3b3b' },
  { cmd: '/shell', desc: 'Red runs allowed local shell', color: '#ff3b3b' },
  { cmd: '/scrape', desc: 'Red scrapes a URL through local bridge', color: '#ff3b3b' },
  { cmd: '/code', desc: 'Green builds it', color: '#2dff7a' },
  { cmd: '/brainstorm', desc: 'Yellow expands', color: '#ffe53b' },
  { cmd: '/factcheck', desc: 'Blue analyzes', color: '#3b8fff' },
  { cmd: '/remember', desc: 'Purple pins to memory', color: '#b53bff' },
  { cmd: '/toxiclaw', desc: 'ToxicLaw answers through local Ollama', color: '#ff1744' },
  { cmd: '/ask <color>', desc: 'Force a specific agent', color: '#aaaaaa' },
  { cmd: '/swarm', desc: 'Everyone weighs in', color: '#aaaaaa' },
];

/**
 * Extract @agent mentions from a piece of text (used to chain agent-to-agent
 * responses in a group chat). Only returns agent IDs that exist in the
 * provided list.
 */
export function extractAgentMentions(
  text: string,
  agents: { id: string; name: string }[],
): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const a of agents) {
    const marker = `@${a.name.toLowerCase()}`;
    if (lower.includes(marker)) found.push(a.id);
  }
  return [...new Set(found)];
}
