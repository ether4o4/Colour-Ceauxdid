import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SwarmAgent } from '../types';
import { COLORS } from '../utils/theme';

interface Props {
  agents: SwarmAgent[];
  typingAgents: Set<string>;
  /** When provided, pills become tappable to mute/unmute that agent. */
  mutedAgents?: Set<string>;
  onToggleMute?: (id: string) => void;
}

export default function AgentStrip({ agents, typingAgents, mutedAgents, onToggleMute }: Props) {
  return (
    <View style={styles.container}>
      {onToggleMute && (
        <Text style={styles.hint}>tap an agent to mute / unmute</Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {agents.map(agent => (
          <AgentPill
            key={agent.id}
            agent={agent}
            isTyping={typingAgents.has(agent.id)}
            muted={!!mutedAgents?.has(agent.id)}
            onPress={onToggleMute ? () => onToggleMute(agent.id) : undefined}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function AgentPill({
  agent, isTyping, muted, onPress,
}: { agent: SwarmAgent; isTyping: boolean; muted: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.pill, { borderColor: agent.colorHex + '40' }, muted && styles.pillMuted]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.dot, { backgroundColor: muted ? COLORS.muted : isTyping ? agent.colorHex : agent.colorHex + '50' }]}>
        {isTyping && !muted && <View style={[styles.pulse, { backgroundColor: agent.colorHex + '30' }]} />}
      </View>
      <Text style={[styles.name, { color: muted ? COLORS.muted : isTyping ? agent.colorHex : COLORS.muted }, muted && styles.nameMuted]}>
        {agent.name.toUpperCase()}
      </Text>
      {muted ? (
        <Text style={styles.mutedTag}>muted</Text>
      ) : isTyping ? (
        <Text style={[styles.thinking, { color: agent.colorHex }]}>...</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
  },
  hint: {
    color: COLORS.muted,
    fontSize: 9,
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  scroll: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: 'row',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  pillMuted: {
    opacity: 0.5,
    borderStyle: 'dashed',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'relative',
  },
  pulse: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    top: -3,
    left: -3,
  },
  name: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  nameMuted: {
    textDecorationLine: 'line-through',
  },
  thinking: {
    fontSize: 12,
    letterSpacing: 2,
  },
  mutedTag: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.muted,
  },
});
