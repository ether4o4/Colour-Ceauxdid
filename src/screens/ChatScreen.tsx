import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwarmMessage, SwarmAgent } from '../types';
import { COLORS } from '../utils/theme';
import { getMessages, saveMessage, getCustomAgents } from '../store';
import { DEFAULT_AGENTS, routeMessage, getAgentById } from '../agents/config';
import { streamAgentResponse } from '../utils/api';
import MessageBubble, { TypingBubble } from '../components/MessageBubble';
import AgentStrip from '../components/AgentStrip';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function ChatScreen() {
  const [messages, setMessages] = useState<SwarmMessage[]>([]);
  const [input, setInput] = useState('');
  const [typingAgents, setTypingAgents] = useState<Set<string>>(new Set());
  const [streamingMessages, setStreamingMessages] = useState<Record<string, string>>({});
  const [customAgents, setCustomAgents] = useState<SwarmAgent[]>([]);
  const [allAgents, setAllAgents] = useState<SwarmAgent[]>(DEFAULT_AGENTS);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [msgs, customs] = await Promise.all([getMessages(), getCustomAgents()]);
    setMessages(msgs);
    setCustomAgents(customs);
    setAllAgents([...DEFAULT_AGENTS, ...customs]);
  }

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');

    // Save user message
    const userMsg: SwarmMessage = {
      id: uuidv4(),
      text,
      senderId: 'user',
      senderName: 'You',
      senderColor: '#ffffff',
      isAgent: false,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    await saveMessage(userMsg);
    scrollToBottom();

    // Determine which agents respond
    const agentIds = routeMessage(text, customAgents);

    // Fire agents sequentially with small delay for natural feel
    for (let i = 0; i < agentIds.length; i++) {
      const agentId = agentIds[i];
      const agent = getAgentById(agentId, customAgents);
      if (!agent) continue;

      // Small stagger
      await new Promise(r => setTimeout(r, i * 800));
      await streamAgentMessage(agent, text);
    }
  }

  async function streamAgentMessage(agent: SwarmAgent, userMessage: string) {
    const msgId = uuidv4();
    const agentMsg: SwarmMessage = {
      id: msgId,
      text: '',
      senderId: agent.id,
      senderName: agent.name,
      senderColor: agent.colorHex,
      isAgent: true,
      timestamp: Date.now(),
    };

    // Show typing
    setTypingAgents(prev => new Set([...prev, agent.id]));

    // Add to messages with empty text
    setMessages(prev => [...prev, agentMsg]);
    scrollToBottom();

    await new Promise(r => setTimeout(r, 600)); // brief thinking delay

    setTypingAgents(prev => { const s = new Set(prev); s.delete(agent.id); return s; });

    // Current messages for context
    const currentMsgs = await getMessages();

    return new Promise<void>((resolve) => {
      let fullText = '';

      streamAgentResponse(
        agent,
        userMessage,
        currentMsgs,
        (chunk) => {
          fullText += chunk;
          setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, text: fullText } : m
          ));
          scrollToBottom();
        },
        async () => {
          // Save final message
          const finalMsg = { ...agentMsg, text: fullText };
          await saveMessage(finalMsg);
          resolve();
        },
        (err) => {
          setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, text: `[${agent.name} error: ${err}]` } : m
          ));
          resolve();
        }
      );
    });
  }

  const renderItem = useCallback(({ item }: { item: SwarmMessage }) => (
    <MessageBubble message={item} />
  ), []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COLOUR CEAUXDID</Text>
        <Text style={styles.headerSub}>SWARM ACTIVE · {allAgents.length} AGENTS</Text>
      </View>

      {/* Agent strip */}
      <AgentStrip agents={allAgents} typingAgents={typingAgents} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          onContentSizeChange={scrollToBottom}
          ListEmptyComponent={<EmptyState />}
        />

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message the swarm... @Red @Blue @swarm"
            placeholderTextColor={COLORS.muted}
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Text style={styles.sendBtnText}>▶</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>◈ SWARM READY</Text>
      <Text style={styles.emptyText}>
        {'Type a message to begin.\nUse @Red @Blue @Green @Yellow @Purple\nor @swarm for all agents.'}
      </Text>
      <View style={styles.emptyHints}>
        {[
          ['@swarm', 'broadcast to all'],
          ['@Red', 'command decision'],
          ['@Blue', 'analysis'],
          ['@Green', 'build something'],
          ['@Yellow', 'brainstorm'],
          ['@Purple', 'memory/context'],
        ].map(([tag, desc]) => (
          <View key={tag} style={styles.hint}>
            <Text style={styles.hintTag}>{tag}</Text>
            <Text style={styles.hintDesc}>{desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
  },
  headerSub: {
    color: COLORS.green,
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 2,
  },
  messageList: { flex: 1, backgroundColor: COLORS.bg },
  messageContent: { paddingVertical: 12, paddingBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: COLORS.red,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.surfaceElevated },
  sendBtnText: { color: '#fff', fontSize: 16 },
  empty: { flex: 1, padding: 24, paddingTop: 48 },
  emptyTitle: {
    color: COLORS.red,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyHints: { gap: 8 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hintTag: { color: COLORS.blue, fontSize: 12, fontWeight: '700', width: 70 },
  hintDesc: { color: COLORS.muted, fontSize: 12 },
});
