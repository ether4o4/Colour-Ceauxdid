import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Modal, FlatList,
} from 'react-native';
import { getApiConfig, saveApiConfig, getSwarmConfig, saveSwarmConfig } from '../store';

const PROVIDERS = ['openrouter', 'openai', 'anthropic', 'custom'];

const MODELS_BY_PROVIDER: Record<string, { label: string; value: string }[]> = {
  openrouter: [
    { label: 'Auto (Free Router)', value: 'openrouter/free' },
    { label: 'DeepSeek R1 (free)', value: 'deepseek/deepseek-r1:free' },
    { label: 'DeepSeek R1 Distill Llama 70B (free)', value: 'deepseek/deepseek-r1-distill-llama-70b:free' },
    { label: 'Qwen 2.5 72B (free)', value: 'qwen/qwen-2.5-72b-instruct:free' },
    { label: 'Gemma 3 12B (free)', value: 'google/gemma-3-12b-it:free' },
    { label: 'Llama 3.3 70B (free)', value: 'meta-llama/llama-3.3-70b-instruct:free' },
    { label: 'Mistral Small 3.1 (free)', value: 'mistralai/mistral-small-3.1-24b-instruct:free' },
  ],
  openai: [
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  ],
  anthropic: [
    { label: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
    { label: 'Claude Haiku 4.5', value: 'claude-haiku-4-5-20251001' },
    { label: 'Claude Opus 4.6', value: 'claude-opus-4-6' },
  ],
  custom: [
    { label: 'Custom Model', value: 'custom' },
  ],
};

const BASE_URLS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  custom: '',
};

interface DropdownProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
  placeholder?: string;
}

function Dropdown({ label, value, options, onSelect, placeholder }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(true)}>
        <Text style={[styles.dropdownText, !selected && styles.placeholder]}>
          {selected ? selected.label : (placeholder || 'Select...')}
        </Text>
        <Text style={styles.dropdownArrow}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={i => i.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item.value === value && styles.optionSelected]}
                  onPress={() => { onSelect(item.value); setOpen(false); }}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionTextSelected]}>
                    {item.label}
                  </Text>
                  {item.value === value && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function SettingsScreen() {
  const [provider, setProvider] = useState('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://openrouter.ai/api/v1');
  const [model, setModel] = useState('openrouter/free');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; detail?: string } | null>(null);
  const [silentMode, setSilentMode] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    const cfg = await getApiConfig();
    if (cfg.provider) setProvider(cfg.provider);
    if (cfg.apiKey) setApiKey(cfg.apiKey);
    if (cfg.baseUrl) setBaseUrl(cfg.baseUrl);
    if (cfg.model) setModel(cfg.model);
    const swarm = await getSwarmConfig();
    setSilentMode(swarm.silentMode || false);
  };

  const handleProviderChange = (p: string) => {
    setProvider(p);
    setBaseUrl(BASE_URLS[p] || '');
    const models = MODELS_BY_PROVIDER[p] || [];
    if (models.length > 0) setModel(models[0].value);
  };

  const handleSave = async () => {
    await saveApiConfig({ provider, apiKey, baseUrl, model });
    await saveSwarmConfig({ silentMode });
    setTestResult(null);
    Alert.alert('Saved', 'Settings saved successfully.');
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { testApiConnection } = await import('../utils/api');
      const result = await testApiConnection();
      setTestResult(result);
    } catch (e: any) {
      setTestResult({ ok: false, detail: e?.message || 'Error' });
    } finally {
      setTesting(false);
    }
  };

  const providerOptions = PROVIDERS.map(p => ({ label: p.charAt(0).toUpperCase() + p.slice(1), value: p }));
  const modelOptions = MODELS_BY_PROVIDER[provider] || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>SYSTEM SETTINGS</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API & MODEL</Text>
        <View style={styles.card}>
          <Dropdown label="PROVIDER" value={provider} options={providerOptions} onSelect={handleProviderChange} />
          <View style={styles.fieldGroup}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>API KEY</Text>
              {testResult && (
                <Text style={[styles.badge, testResult.ok ? styles.badgeGreen : styles.badgeRed]}>
                  {testResult.ok ? 'CONNECTED' : 'NOT SET'}
                </Text>
              )}
            </View>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Enter API key..."
              placeholderTextColor="#555"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
          {(provider === 'custom' || provider === 'openrouter') && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>BASE URL</Text>
              <TextInput style={styles.input} value={baseUrl} onChangeText={setBaseUrl} placeholder="https://..." placeholderTextColor="#555" autoCapitalize="none" />
            </View>
          )}
          <Dropdown label="MODEL" value={model} options={modelOptions} onSelect={setModel} placeholder="Select a model..." />
          {testResult && !testResult.ok && testResult.detail && (
            <Text style={styles.errorText}>{testResult.detail}</Text>
          )}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleTest} disabled={testing}>
              <Text style={styles.btnSecondaryText}>{testing ? 'TESTING...' : 'TEST'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
              <Text style={styles.btnPrimaryText}>SAVE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SILENT MODE</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Limit active agents</Text>
              <Text style={styles.toggleSub}>Only focused agents will respond</Text>
            </View>
            <TouchableOpacity style={[styles.toggle, silentMode && styles.toggleOn]} onPress={() => setSilentMode(!silentMode)} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: '#fff', fontSize: 13, letterSpacing: 3, fontWeight: '600', marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#555', fontSize: 11, letterSpacing: 2, marginBottom: 8 },
  card: { backgroundColor: '#111118', borderRadius: 12, padding: 16 },
  fieldGroup: { marginBottom: 16 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  fieldLabel: { color: '#666', fontSize: 11, letterSpacing: 1.5, marginBottom: 6 },
  dropdown: { backgroundColor: '#1a1a24', borderRadius: 8, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { color: '#fff', fontSize: 14 },
  dropdownArrow: { color: '#666', fontSize: 16 },
  placeholder: { color: '#555' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#1a1a24', borderRadius: 12, maxHeight: 400, overflow: 'hidden' },
  modalTitle: { color: '#666', fontSize: 11, letterSpacing: 1.5, padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  option: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#111' },
  optionSelected: { backgroundColor: '#0d0d1a' },
  optionText: { color: '#aaa', fontSize: 14 },
  optionTextSelected: { color: '#fff' },
  checkmark: { color: '#3bfff0', fontSize: 14 },
  input: { backgroundColor: '#1a1a24', borderRadius: 8, padding: 14, color: '#fff', fontSize: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, fontSize: 10, letterSpacing: 1 },
  badgeGreen: { color: '#2dff7a', borderColor: '#2dff7a' },
  badgeRed: { color: '#ff3b3b', borderColor: '#ff3b3b' },
  errorText: { color: '#ff3b3b', fontSize: 12, marginBottom: 12 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btnSecondary: { flex: 1, backgroundColor: '#1a1a24', borderRadius: 8, padding: 14, alignItems: 'center' },
  btnSecondaryText: { color: '#aaa', fontSize: 13, letterSpacing: 1 },
  btnPrimary: { flex: 1, backgroundColor: '#1a6fff', borderRadius: 8, padding: 14, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 13, letterSpacing: 1, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { color: '#fff', fontSize: 14, marginBottom: 4 },
  toggleSub: { color: '#555', fontSize: 12 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#333' },
  toggleOn: { backgroundColor: '#1a6fff' },
});
