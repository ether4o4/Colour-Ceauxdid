/**
 * Text-to-speech for agent replies (expo-speech / device TTS engine).
 *
 * Each agent gets a distinct voice character via pitch + rate (reliable across
 * devices, unlike named voices which vary). Utterances queue, so agents in a
 * group chat speak one after another instead of over each other.
 */
import * as Speech from 'expo-speech';

type VoiceProfile = { pitch: number; rate: number };

// id → voice character. Tuned so the colors sound distinct.
const VOICE_PROFILES: Record<string, VoiceProfile> = {
  red: { pitch: 0.8, rate: 1.0 }, // low, commanding
  blue: { pitch: 1.0, rate: 0.98 }, // even, measured
  green: { pitch: 1.08, rate: 1.12 }, // upbeat, quick
  yellow: { pitch: 1.28, rate: 1.1 }, // bright, lively
  purple: { pitch: 0.92, rate: 0.88 }, // calm, slow
  toxiclaw: { pitch: 0.85, rate: 0.95 }, // serious, deliberate
};
const DEFAULT_PROFILE: VoiceProfile = { pitch: 1.0, rate: 1.0 };

// Stable-ish profile for custom agents: derive pitch from the id so each one
// is consistent but varied.
function profileFor(agentId: string): VoiceProfile {
  if (VOICE_PROFILES[agentId]) return VOICE_PROFILES[agentId];
  let h = 0;
  for (let i = 0; i < agentId.length; i++) h = (h * 31 + agentId.charCodeAt(i)) >>> 0;
  const pitch = 0.85 + (h % 50) / 100; // 0.85–1.34
  const rate = 0.95 + ((h >> 5) % 25) / 100; // 0.95–1.19
  return { pitch, rate };
}

let enabled = false;

export function setVoiceEnabled(on: boolean) {
  enabled = on;
  if (!on) {
    try { Speech.stop(); } catch {}
  }
}

export function isVoiceEnabled(): boolean {
  return enabled;
}

// Make a streamed agent message readable aloud: drop code, markdown, and links.
function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '. (code block) ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_#>~|]/g, '')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
}

export function speak(agentId: string, text: string) {
  if (!enabled) return;
  const body = cleanForSpeech(text);
  if (!body) return;
  const { pitch, rate } = profileFor(agentId);
  try {
    Speech.speak(body, { pitch, rate });
  } catch {}
}

export function stopSpeaking() {
  try { Speech.stop(); } catch {}
}
