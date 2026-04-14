import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../types';

interface Props {
  message: Message;
  isFirstInGroup?: boolean;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function MessageBubble({ message, isFirstInGroup = true }: Props) {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';

  if (isSystem) {
    return (
      <View style={styles.systemRow}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
        <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
      </View>
    );
  }

  // Agent message
  const accentColor = message.agentHexColor ?? '#888';

  return (
    <View style={styles.agentRow}>
      {isFirstInGroup && (
        <View style={styles.agentHeader}>
          <View style={[styles.agentDot, { backgroundColor: accentColor }]} />
          <Text style={[styles.agentName, { color: accentColor }]}>
            {message.agentName ?? 'Agent'}
          </Text>
          {message.confidenceScore !== undefined && (
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {Math.round(message.confidenceScore * 100)}%
              </Text>
            </View>
          )}
          <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
        </View>
      )}
      <View style={[styles.agentBubble, { borderLeftColor: accentColor }]}>
        <Text style={styles.agentText}>{message.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // User
  userRow: {
    alignItems: 'flex-end',
    marginVertical: 4,
    marginHorizontal: 12,
  },
  userBubble: {
    backgroundColor: '#2A2A3A',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: '80%',
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },

  // Agent
  agentRow: {
    marginVertical: 4,
    marginHorizontal: 12,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  agentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  agentName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  confidenceBadge: {
    backgroundColor: '#2A2A3A',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 4,
  },
  confidenceText: {
    color: '#AAA',
    fontSize: 11,
    fontWeight: '600',
  },
  agentBubble: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    borderBottomLeftRadius: 4,
    borderLeftWidth: 3,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: '90%',
  },
  agentText: {
    color: '#E8E8F0',
    fontSize: 15,
    lineHeight: 22,
  },

  // System
  systemRow: {
    alignItems: 'center',
    marginVertical: 4,
    marginHorizontal: 20,
  },
  systemText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Shared
  timestamp: {
    color: '#555',
    fontSize: 11,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
});
