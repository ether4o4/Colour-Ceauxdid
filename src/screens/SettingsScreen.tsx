import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, TextInput, Alert, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../utils/theme';
import {
  getSettings, updateSettings, clearAllMessages,
  getWorkflows, saveWorkflow, deleteWorkflow,
  getApiConfig, updateApiConfig,
} from '../store';
import { testApiConnection } from '../utils/api';
import { DEFAULT_AGENTS } from '../agents/config';
import { Workflow, ApiProvider, ApiConfig } from '../types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const PROVIDER_DEFAULTS: Record<ApiProvider, { baseUrl: string; model: string; label: string }> = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    label: 'OpenRouter',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    label: 'OpenAI',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-haiku-4-5-20251001',
    label: 'Anthropic',
  },
  custom: {
    baseUrl: '',
    model: '',
    label: 'Custom',
  },
};

export default function SettingsScreen() {
  const [silentMode, setSilentMode] = useState(false);
  const [focusedAgents, setFocusedAgents] = useState<string[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [showWorkflowCreate, setShowWorkflowCreate] = useState(false);
  const [workflowName, setWorkflowName] = useState('');

  // API config state
  const [apiProvider, setApiProvider] = useState<ApiProvider>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState(PROVIDER_DEFAULTS.openrouter.baseUrl);
  const [apiModel, setApiModel] = useState(PROVIDER_DEFAULTS.openrouter.model);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiDirty, setApiDirty] = useState(false);
  const [apiTesting, setApiTesting] = useState(false);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'ok' | 'fail'>('unknown');
  const [apiStatusDetail, setApiStatusDetail] = useState<string>('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [settings, wfs, apiCfg] = await Promise.all([getSettings(), getWorkflows(), getApiConfig()]);
    setSilentMode(settings.silentMode || false);
    setFocusedAgents(settings.focusedAgents || []);
    setWorkflows(wfs);
    setApiProvider(apiCfg.provider);
    setApiKey(apiCfg.apiKey || '');
    setApiBaseUrl(apiCfg.baseUrl);
    setApiModel(apiCfg.model);
    setApiDirty(false);
    setApiStatus(apiCfg.apiKey ? 'unknown' : 'fail');
    if (!apiCfg.apiKey) setApiStatusDetail('No key set');
  }

  function handleProviderChange(next: ApiProvider) {
    setApiProvider(next);
    const def = PROVIDER_DEFAULTS[next];
    // Only auto-fill if user hasn't customized — i.e. previous fields match the previous provider's defaults.
    setApiBaseUrl(def.baseUrl);
    setApiModel(def.model);
    setApiDirty(true);
  }

  async function saveApiConfig(showAlert = true) {
    const cfg: Partial<ApiConfig> = {
      provider: apiProvider,
      apiKey: apiKey.trim(),
      baseUrl: apiBaseUrl.trim() || PROVIDER_DEFAULTS[apiProvider].baseUrl,
      model: apiModel.trim() || PROVIDER_DEFAULTS[apiProvider].model,
    };
    await updateApiConfig(cfg);
    setApiDirty(false);
    if (showAlert) Alert.alert('Saved', 'API configuration saved.');
  }

  async function handleTestConnection() {
    if (apiDirty) await saveApiConfig(false);
    setApiTesting(true);
    setApiStatus('unknown');
    setApiStatusDetail('Testing…');
    const res = await testApiConnection();
    setApiTesting(false);
    setApiStatus(res.ok ? 'ok' : 'fail');
    setApiStatusDetail(res.ok ? 'Connection OK' : (res.detail || 'Failed'));
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
    Alert.alert('Clear Chat', 'Delete all messages across every project and agent? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await clearAllMessages(); } }
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

        {/* API / Model */}
        <Section title="API & MODEL">
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Provider</Text>
              <Text style={styles.rowSub}>Where chat completions are sent</Text>
            </View>
            <View style={[
              styles.statusPill,
              apiStatus === 'ok' && { borderColor: COLORS.green, backgroundColor: COLORS.green + '15' },
              apiStatus === 'fail' && { borderColor: COLORS.red, backgroundColor: COLORS.red + '15' },
            ]}>
              <Text style={[
                styles.statusPillText,
                apiStatus === 'ok' && { color: COLORS.green },
                apiStatus === 'fail' && { color: COLORS.red },
              ]}>
                {apiStatus === 'ok' ? 'CONNECTED' : apiStatus === 'fail' ? 'NOT SET' : 'UNKNOWN'}
              </Text>
            </View>
          </View>

          <View style={styles.providerRow}>
            {(Object.keys(PROVIDER_DEFAULTS) as ApiProvider[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.providerChip, apiProvider === p && styles.providerChipActive]}
                onPress={() => handleProviderChange(p)}
              >
                <Text style={[styles.providerChipText, apiProvider === p && styles.providerChipTextActive]}>
                  {PROVIDER_DEFAULTS[p].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>API KEY</Text>
            <View style={styles.keyRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder={apiProvider === 'openrouter' ? 'sk-or-v1-…' : apiProvider === 'openai' ? 'sk-…' : apiProvider === 'anthropic' ? 'sk-ant-…' : 'your key'}
                placeholderTextColor={COLORS.muted}
                value={apiKey}
                onChangeText={(v) => { setApiKey(v); setApiDirty(true); }}
                secureTextEntry={!apiKeyVisible}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setApiKeyVisible(v => !v)}>
                <Text style={styles.eyeText}>{apiKeyVisible ? 'HIDE' : 'SHOW'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>BASE URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://…"
              placeholderTextColor={COLORS.muted}
              value={apiBaseUrl}
              onChangeText={(v) => { setApiBaseUrl(v); setApiDirty(true); }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>MODEL</Text>
            <TextInput
              style={styles.input}
              placeholder="model-id"
              placeholderTextColor={COLORS.muted}
              value={apiModel}
              onChangeText={(v) => { setApiModel(v); setApiDirty(true); }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {apiStatusDetail ? (
            <Text style={[
              styles.statusDetail,
              apiStatus === 'ok' && { color: COLORS.green },
              apiStatus === 'fail' && { color: COLORS.red },
            ]}>{apiStatusDetail}</Text>
          ) : null}

          <View style={styles.wfBtns}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleTestConnection}
              disabled={apiTesting || !apiKey.trim()}
            >
              {apiTesting
                ? <ActivityIndicator size="small" color={COLORS.muted} />
                : <Text style={styles.cancelText}>TEST</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !apiDirty && { opacity: 0.5 }]}
              onPress={() => saveApiConfig(true)}
              disabled={!apiDirty}
            >
              <Text style={styles.saveBtnText}>SAVE</Text>
            </TouchableOpacity>
          </View>
        </Section>

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

  // API section
  statusPill: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: COLORS.surfaceElevated,
  },
  statusPillText: { color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  providerChip: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.surfaceElevated,
  },
  providerChipActive: {
    borderColor: COLORS.blue, backgroundColor: COLORS.blue + '15',
  },
  providerChipText: { color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  providerChipTextActive: { color: COLORS.blue },
  fieldGroup: { gap: 4 },
  fieldLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  keyRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  eyeBtn: {
    paddingHorizontal: 10, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    backgroundColor: COLORS.surfaceElevated,
  },
  eyeText: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  statusDetail: { fontSize: 11, color: COLORS.muted },
});
