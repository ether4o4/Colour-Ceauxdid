import React, { useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { MessageBubble } from '../components/MessageBubble';
import { TypingIndicator } from '../components/TypingIndicator';
import { AgentStatusBar } from '../components/AgentStatusBar';
import { InputBar } from '../components/InputBar';
import { Message, Agent } from '../types';

type ListItem =
  | { type: 'message'; data: Message; isFirstInGroup: boolean }
  | { type: 'typing'; agentId: string; agentName: string; agentColor: string };

export function ChatScreen() {
  const { state, sendUserMessage } = useStore();
  const { agents, chatState, isLoading } = state;
  const flatListRef = useRef<FlatList>(null);
  const navigation = useNavigation<any>();

  const isAnyAgentBusy = agents.some(
    a => a.status === 'thinking' || a.status === 'responding',
  );

  // Build flat list data from messages + typing indicators
  const listData: ListItem[] = React.useMemo(() => {
    const items: ListItem[] = [];
    const messages = chatState.messages;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const prev = messages[i - 1];
      const isFirstInGroup =
        !prev ||
        prev.sender !== msg.sender ||
        msg.agentId !== prev.agentId ||
        msg.timestamp - prev.timestamp > 60_000;

      items.push({ type: 'message', data: msg, isFirstInGroup });
    }

    // Append typing indicators
    for (const agentId of chatState.typingAgentIds) {
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        items.push({
          type: 'typing',
          agentId,
          agentName: agent.name,
          agentColor: agent.hexColor,
        });
      }
    }

    return items;
  }, [chatState.messages, chatState.typingAgentIds, agents]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'typing') {
      return (
        <TypingIndicator
          agentName={item.agentName}
          agentColor={item.agentColor}
        />
      );
    }
    return <MessageBubble message={item.data} isFirstInGroup={item.isFirstInGroup} />;
  }, []);

  const keyExtractor = useCallback((item: ListItem) => {
    if (item.type === 'typing') return `typing-${item.agentId}`;
    return item.data.id;
  }, []);

  const scrollToBottom = () => {
    if (flatListRef.current && listData.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Initializing agents...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COLOUR CEAUXDID</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Agents')}
          >
            <Text style={styles.headerButtonText}>Agents</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Status')}
          >
            <Text style={styles.headerButtonText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Agent status bar */}
      <AgentStatusBar agents={agents} />

      {/* Message feed */}
      {chatState.messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Multi-Agent Environment</Text>
          <Text style={styles.emptySubtitle}>
            5 agents are ready.{'\n'}
            Use @Red, @Blue, @Green, @Yellow, @Purple to address agents directly,{'\n'}
            or @swarm to engage all agents simultaneously.
          </Text>
          <View style={styles.quickStartList}>
            <Text style={styles.quickStartItem}>• @swarm analyze this idea and build a plan</Text>
            <Text style={styles.quickStartItem}>• @Blue break down this problem for me</Text>
            <Text style={styles.quickStartItem}>• @Green build me a function that does X</Text>
            <Text style={styles.quickStartItem}>• @Yellow give me creative alternatives</Text>
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.feedContent}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={20}
          windowSize={10}
        />
      )}

      {/* Input */}
      <InputBar
        agents={agents}
        onSend={sendUserMessage}
        disabled={isAnyAgentBusy}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A15',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A15',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#555',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0D0D1A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E30',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1E1E30',
    borderRadius: 8,
  },
  headerButtonText: {
    color: '#8888CC',
    fontSize: 13,
    fontWeight: '600',
  },
  feedContent: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    gap: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  quickStartList: {
    alignSelf: 'stretch',
    backgroundColor: '#0D0D1A',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  quickStartItem: {
    color: '#555',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
});
