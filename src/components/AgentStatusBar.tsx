import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Agent } from '../types';

interface Props {
  agents: Agent[];
  onAgentPress?: (agent: Agent) => void;
}

const STATUS_COLORS: Record<string, string> = {
  idle: '#444',
  thinking: '#FDD835',
  responding: '#43A047',
  error: '#E53935',
  muted: '#555',
  disabled: '#333',
};

export function AgentStatusBar({ agents, onAgentPress }: Props) {
  return (
    <View style={styles.container}>
      {agents.map(agent => (
        <TouchableOpacity
          key={agent.id}
          style={styles.agentChip}
          onPress={() => onAgentPress?.(agent)}
          disabled={!onAgentPress}
        >
          <View
            style={[
              styles.statusRing,
              { borderColor: agent.hexColor },
              (agent.status === 'muted' || agent.status === 'disabled') && styles.dimRing,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLORS[agent.status] ?? STATUS_COLORS.idle },
              ]}
            />
          </View>
          <Text
            style={[
              styles.agentName,
              { color: agent.hexColor },
              (agent.status === 'muted' || agent.status === 'disabled') && styles.dimText,
            ]}
          >
            {agent.name}
          </Text>
          {(agent.status === 'thinking' || agent.status === 'responding') && (
            <View style={[styles.activeIndicator, { backgroundColor: agent.hexColor }]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#0D0D1A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E30',
  },
  agentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#1A1A2E',
  },
  statusRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimRing: {
    opacity: 0.4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  agentName: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dimText: {
    opacity: 0.4,
  },
  activeIndicator: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.8,
  },
});
