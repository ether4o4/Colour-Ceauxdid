import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, ScrollView, TextInput, Alert, Switch,
} from 'react-native';
import { COLORS } from '../utils/theme';
import { getSettings, updateSettings, clearMessages, getWorkflows, saveWorkflow, deleteWorkflow } from '../store';
import { DEFAULT_AGENTS } from '../agents/config';
import { Workflow } from '../types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function SettingsScreen() {
  const [silentMode, setSilentMode] = useState(false);
  const [focusedAgents, setFocusedAgents] = useState<string[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [showWorkflowCreate, setShowWorkflowCreate] = useState(false);
  const [workflowName, setWorkflowName] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [settings, wfs] = await Promise.all([getSettings(), getWorkflows()]);
    setSilentMode(settings.silentMode || false);
    setFocusedAgents(settings.focusedAgents || []);
    setWorkflows(wfs);
  }

  async function toggleSilentMode(val: boolean) {
    setSilentMode(val);
    await updateSettings({ silentMode: val });
  }

  async function toggleFocusAgent(id: string) {
    const next = focusedAgents.includes(id)
      ? focusedAgents.filter(a => a !== id)
      : [...focusedAgents, id];
    setFocusedAgents(next);
    await updateSettings({ focusedAgents: next });
  }

  async function handleClearChat() {
    Alert.alert('Clear Chat', 'Delete all messages? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await clearMessages(); } }
    ]);
  }

  async function createWorkflow() {
    if (!workflowName.trim()) return;
    const wf: Workflow = {
      id: uuidv4(),
      name: workflowName.trim(),
      steps: [],
      createdAt: Date.now(),
    };
    await saveWorkflow(wf);
    await loadAll();
    setWorkflowName('');
    setShowWorkflowCreate(false);
  }

  async function handleDeleteWorkflow(id: string) {
    await deleteWorkflow(id);
    await loadAll();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>SYSTEM SETTINGS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Silent Mode */}
        <Section title="SILENT MODE">
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Limit active agents</Text>
              <Text style={styles.rowSub}>Only focused agents will respond</Text>
            </View>
            <Switch
              value={silentMode}
              onValueChange={toggleSilentMode}
              trackColor={{ false: COLORS.border, true: COLORS.purple }}
              thumbColor={silentMode ? '#fff' : COLORS.muted}
            />
          </View>
        </Section>

        {/* Focus agents */}
        {silentMode && (
          <Section title="FOCUSED AGENTS">
            <View style={styles.chipRow}>
              {DEFAULT_AGENTS.map(agent => {
                const focused = focusedAgents.includes(agent.id);
                return (
                  <TouchableOpacity
                    key={agent.id}
                    style={[styles.chip, { borderColor: focused ? agent.colorHex : COLORS.border }]}
                    onPress={() => toggleFocusAgent(agent.id)}
                  >
                    <Text style={[styles.chipText, { color: focused ? agent.colorHex : COLORS.muted }]}>
                      {agent.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>
        )}

        {/* Workflows */}
        <Section title="SAVED WORKFLOWS">
          {workflows.length === 0 ? (
            <Text style={styles.emptyText}>No workflows saved</Text>
          ) : (
            workflows.map(wf => (
              <View key={wf.id} style={styles.workflowRow}>
                <Text style={styles.workflowName}>{wf.name}</Text>
                <TouchableOpacity onPress={() => handleDeleteWorkflow(wf.id)}>
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
          {showWorkflowCreate ? (
            <View style={styles.workflowCreate}>
              <TextInput
                style={styles.input}
                placeholder="Workflow name..."
                placeholderTextColor={COLORS.muted}
                value={workflowName}
                onChangeText={setWorkflowName}
              />
              <View style={styles.wfBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowWorkflowCreate(false)}>
                  <Text style={styles.cancelText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={createWorkflow}>
                  <Text style={styles.saveBtnText}>SAVE</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addWorkflowBtn} onPress={() => setShowWorkflowCreate(true)}>
              <Text style={styles.addWorkflowText}>+ NEW WORKFLOW</Text>
            </TouchableOpacity>
          )}
        </Section>

        {/* Danger zone */}
        <Section title="SYSTEM">
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearChat}>
            <Text style={styles.dangerText}>CLEAR ALL MESSAGES</Text>
          </TouchableOpacity>
        </Section>

        {/* About */}
        <View style={styles.about}>
          <Text style={styles.aboutTitle}>COLOUR CEAUXDID</Text>
          <Text style={styles.aboutSub}>Multi-Agent AI Orchestration Platform</Text>
          <Text style={styles.aboutSub}>v1.0.0 · OpenRouter · Llama 3.1</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  content: { padding: 12, paddingBottom: 60, gap: 16 },
  section: { gap: 8 },
  sectionTitle: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  sectionContent: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 16, gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flex: 1 },
  rowLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  rowSub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: COLORS.surfaceElevated,
  },
  chipText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  workflowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  workflowName: { color: COLORS.text, fontSize: 13 },
  deleteText: { color: COLORS.muted, fontSize: 16, padding: 4 },
  workflowCreate: { gap: 8 },
  input: {
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 14,
  },
  wfBtns: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    flex: 1, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, paddingVertical: 10, alignItems: 'center',
  },
  cancelText: { color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  saveBtn: { flex: 1, backgroundColor: COLORS.blue, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  addWorkflowBtn: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, borderStyle: 'dashed',
    paddingVertical: 12, alignItems: 'center',
  },
  addWorkflowText: { color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  dangerBtn: {
    borderWidth: 1, borderColor: COLORS.red + '60', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.red + '10',
  },
  dangerText: { color: COLORS.red, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  emptyText: { color: COLORS.muted, fontSize: 12 },
  about: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  aboutTitle: { color: COLORS.text, fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  aboutSub: { color: COLORS.muted, fontSize: 11, letterSpacing: 1 },
});
