import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Alert, Modal, TextInput, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../utils/theme';
import { Project, SavedChat, SwarmAgent } from '../types';
import { DEFAULT_AGENTS } from '../agents/config';
import {
  getProjects, getActiveProjectId, setActiveProjectId, getSavedChats,
  getCustomAgents, saveCustomAgent,
} from '../store';
import SidebarNavigation from '../components/SidebarNavigation';
import ChatMainArea from '../components/ChatMainArea';
import { v4 as uuidv4 } from 'uuid';

export default function ChatHub() {
  const [activeSection, setActiveSection] = useState<'project' | 'agent' | 'saved'>('project');
  const [activeProjectId, setActiveProjectIdState] = useState<string | undefined>();
  const [activeAgentId, setActiveAgentId] = useState<string | undefined>();
  const [activeSavedChatId, setActiveSavedChatId] = useState<string | undefined>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [showCreateAgentModal, setShowCreateAgentModal] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentRole, setAgentRole] = useState('');

  const windowWidth = Dimensions.get('window').width;
  const isLargeScreen = windowWidth > 800;

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    const [p, s] = await Promise.all([
      getProjects(),
      getSavedChats(),
    ]);
    setProjects(p);
    setSavedChats(s);

    // Load active project
    const activeId = await getActiveProjectId();
    if (activeId) {
      setActiveProjectIdState(activeId);
      setActiveSection('project');
    } else if (p.length > 0) {
      setActiveProjectIdState(p[0].id);
      await setActiveProjectId(p[0].id);
      setActiveSection('project');
    }
  }

  async function handleSelectProject(projectId: string) {
    setActiveProjectIdState(projectId);
    await setActiveProjectId(projectId);
    setActiveSection('project');
    setActiveAgentId(undefined);
    setActiveSavedChatId(undefined);
  }

  function handleSelectAgent(agentId: string) {
    setActiveAgentId(agentId);
    setActiveSection('agent');
    setActiveProjectId(undefined);
    setActiveSavedChatId(undefined);
  }

  function handleSelectSavedChat(chatId: string) {
    setActiveSavedChatId(chatId);
    setActiveSection('saved');
    setActiveProjectId(undefined);
    setActiveAgentId(undefined);
  }

  async function handleCreateAgent() {
    if (!agentName.trim() || !agentRole.trim()) {
      Alert.alert('Error', 'Agent name and role are required');
      return;
    }

    const newAgent: SwarmAgent = {
      id: uuidv4(),
      name: agentName,
      color: 'custom',
      colorHex: '#' + Math.floor(Math.random() * 16777215).toString(16),
      specialty: agentRole,
      personality: `Custom agent focused on ${agentRole}`,
      systemPrompt: `You are ${agentName}, a specialized AI agent in the Colour Ceauxdid multi-agent swarm.
Your specialty: ${agentRole}
You work collaboratively with other agents (Red, Blue, Green, Yellow, Purple).
Maintain consistency and contribute your unique perspective to group discussions.`,
      isCustom: true,
      load: 0,
      status: 'idle',
    };

    await saveCustomAgent(newAgent);
    setAgentName('');
    setAgentRole('');
    setShowCreateAgentModal(false);
    setActiveAgentId(newAgent.id);
    setActiveSection('agent');
    Alert.alert('Success', `Agent "${agentName}" created!`);
  }

  // Get active data based on current selection
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeSavedChat = savedChats.find(c => c.id === activeSavedChatId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>
        {/* Sidebar - always visible on large screens, hidden on mobile */}
        {isLargeScreen ? (
          <View style={styles.sidebar}>
            <SidebarNavigation
              activeSection={activeSection}
              activeProjectId={activeProjectId}
              activeAgentId={activeAgentId}
              activeSavedChatId={activeSavedChatId}
              onSelectProject={handleSelectProject}
              onSelectAgent={handleSelectAgent}
              onSelectSavedChat={handleSelectSavedChat}
              onNewProject={() => {}} // handled by sidebar modal
              onCreateAgent={() => setShowCreateAgentModal(true)}
            />
          </View>
        ) : null}

        {/* Main Chat Area */}
        <View style={styles.mainArea}>
          {activeSection === 'project' && activeProject ? (
            <ChatMainArea
              project={activeProject}
              mode="project"
            />
          ) : activeSection === 'agent' && activeAgentId ? (
            <ChatMainArea
              agentId={activeAgentId}
              mode="agent"
            />
          ) : activeSection === 'saved' && activeSavedChat ? (
            <ChatMainArea
              savedChat={activeSavedChat}
              mode="saved"
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>Welcome to Colour Ceauxdid</Text>
              <Text style={styles.emptyStateText}>
                Select a project, agent, or saved chat to begin
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Mobile Navigation Tabs - shown only on small screens */}
      {!isLargeScreen && (
        <View style={styles.mobileTabs}>
          <TouchableOpacity
            style={[styles.mobileTab, activeSection === 'project' && styles.activeTab]}
            onPress={() => setActiveSection('project')}
          >
            <Text style={styles.mobileTabText}>Projects</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mobileTab, activeSection === 'agent' && styles.activeTab]}
            onPress={() => setActiveSection('agent')}
          >
            <Text style={styles.mobileTabText}>Agents</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mobileTab, activeSection === 'saved' && styles.activeTab]}
            onPress={() => setActiveSection('saved')}
          >
            <Text style={styles.mobileTabText}>Saved</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create Agent Modal */}
      <Modal visible={showCreateAgentModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Custom Agent</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Agent name..."
              placeholderTextColor={COLORS.muted}
              value={agentName}
              onChangeText={setAgentName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Specialty / role..."
              placeholderTextColor={COLORS.muted}
              value={agentRole}
              onChangeText={setAgentRole}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowCreateAgentModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={handleCreateAgent}
              >
                <Text style={styles.primaryButtonText}>Create</Text>
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
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    backgroundColor: COLORS.darkBg,
  },
  mainArea: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  mobileTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  mobileTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.highlight,
  },
  mobileTabText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 12,
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
