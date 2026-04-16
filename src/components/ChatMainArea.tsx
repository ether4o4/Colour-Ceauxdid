import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../utils/theme';
import { SwarmMessage, SwarmAgent, Project, SavedChat } from '../types';
import { DEFAULT_AGENTS } from '../agents/config';
import { getMessages, saveMessage, getCustomAgents, saveChatSession } from '../store';
import { streamAgentResponse } from '../utils/api';
import MessageBubble from './MessageBubble';
import AgentStrip from './AgentStrip';
import { v4 as uuidv4 } from 'uuid';

interface ChatMainAreaProps {
  project?: Project;
  agentId?: string;
  savedChat?: SavedChat;
  mode: 'project' | 'agent' | 'saved';
}

export default function ChatMainArea({ project, agentId, savedChat, mode }: ChatMainAreaProps) {
  const [messages, setMessages] = useState<SwarmMessage[]>([]);
  const [input, setInput] = useState('');
  const [typingAgents, setTypingAgents] = useState<Set<string>>(new Set());
  const [customAgents, setCustomAgents] = useState<SwarmAgent[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveChatName, setSaveChatName] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadData();
  }, [project, agentId, savedChat, mode]);

  async function loadData() {
    if (mode === 'saved' && savedChat) {
      setMessages(savedChat.messages);
    } else {
      const msgs = await getMessages();
      setMessages(msgs);
    }
    const customs = await getCustomAgents();
    setCustomAgents(customs);
  }

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');

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

    // If individual agent mode, only that agent responds
    if (mode === 'agent' && agentId) {
      const agent = [...DEFAULT_AGENTS, ...customAgents].find(a => a.id === agentId);
      if (agent) {
        await streamAgentMessage(agent, text);
      }
    }
    // If project mode, route to multiple agents
    else if (mode === 'project' && project) {
      const agents = [...DEFAULT_AGENTS, ...customAgents].filter(a =>
        project.agents.includes(a.id)
      );
      for (let i = 0; i < agents.length; i++) {
        await new Promise(r => setTimeout(r, i * 800));
        await streamAgentMessage(agents[i], text);
      }
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

    setTypingAgents(prev => new Set([...prev, agent.id]));
    setMessages(prev => [...prev, agentMsg]);
    scrollToBottom();

    await new Promise(r => setTimeout(r, 600));
    setTypingAgents(prev => { const s = new Set(prev); s.delete(agent.id); return s; });

    const currentMsgs = await getMessages();
    let fullResponse = '';

    await streamAgentResponse(
      agent,
      userMessage,
      currentMsgs,
      (chunk: string) => {
        fullResponse += chunk;
        setMessages(prev =>
          prev.map(m => m.id === msgId ? { ...m, text: fullResponse } : m)
        );
        scrollToBottom();
      },
      () => {}, // onDone
      (error: string) => {
        Alert.alert('Error', error);
      }
    );

    const finalMsg = { ...agentMsg, text: fullResponse };
    await saveMessage(finalMsg);
  }

  async function handleSaveChat() {
    if (!saveChatName.trim()) {
      Alert.alert('Error', 'Chat name is required');
      return;
    }

    const newSavedChat: SavedChat = {
      id: uuidv4(),
      name: saveChatName,
      projectId: project?.id,
      agentId: mode === 'agent' ? agentId : undefined,
      messages,
      createdAt: Date.now(),
      type: 'saved',
    };

    await saveChatSession(newSavedChat);
    setSaveChatName('');
    setShowSaveModal(false);
    Alert.alert('Success', `Chat "${saveChatName}" saved!`);
  }

  const headerTitle = mode === 'project' ? project?.name : mode === 'agent' ?
    [...DEFAULT_AGENTS, ...customAgents].find(a => a.id === agentId)?.name :
    savedChat?.name;

  const projectAgents = project ? [...DEFAULT_AGENTS, ...customAgents].filter(a =>
    project.agents.includes(a.id)
  ) : [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{headerTitle || 'Chat'}</Text>
        <View style={styles.headerRight}>
          {mode === 'project' && (
            <Text style={styles.onlineCount}>
              {projectAgents.length} agents
            </Text>
          )}
          <TouchableOpacity onPress={() => setShowSaveModal(true)}>
            <Text style={styles.headerIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Agent Selector (Project mode) */}
      {mode === 'project' && projectAgents.length > 0 && (
        <View style={styles.agentSelectorContainer}>
          <AgentStrip agents={projectAgents} typingAgents={typingAgents} />
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={msg => msg.id}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isStreaming={typingAgents.has(item.senderId)}
          />
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => scrollToBottom()}
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor={COLORS.muted}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Save Chat Modal */}
      <Modal visible={showSaveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Chat</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Chat name..."
              placeholderTextColor={COLORS.muted}
              value={saveChatName}
              onChangeText={setSaveChatName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={handleSaveChat}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  onlineCount: {
    color: COLORS.muted,
    fontSize: 12,
  },
  headerIcon: {
    color: COLORS.text,
    fontSize: 18,
  },
  agentSelectorContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.highlight,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.darkBg,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtonText: {
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: COLORS.highlight,
    borderColor: COLORS.highlight,
  },
  primaryButtonText: {
    color: '#000',
    textAlign: 'center',
    fontWeight: '600',
  },
});
