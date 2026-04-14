import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  StatusBar, Modal, TextInput, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwarmAgent } from '../types';
import { COLORS } from '../utils/theme';
import { DEFAULT_AGENTS, CUSTOM_AGENT_COLORS } from '../agents/config';
import { getCustomAgents, saveCustomAgent, deleteCustomAgent } from '../store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function AgentsScreen() {
  const [customAgents, setCustomAgents] = useState<SwarmAgent[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [personality, setPersonality] = useState('');
  const [selectedColor, setSelectedColor] = useState(CUSTOM_AGENT_COLORS[0]);

  useEffect(() => { loadCustom(); }, []);

  async function loadCustom() {
    setCustomAgents(await getCustomAgents());
  }

  async function createAgent() {
    if (!name.trim() || !specialty.trim()) return;
    if (customAgents.length >= 5) {
      Alert.alert('Limit reached', 'Maximum 5 custom agents allowed.');
      return;
    }

    const agent: SwarmAgent = {
      id: uuidv4(),
      name: name.trim(),
      color: 'custom',
      colorHex: selectedColor,
      specialty: specialty.trim(),
      personality: personality.trim() || `Specialist in ${specialty}`,
      systemPrompt: `You are ${name.trim()}, a custom agent in a multi-agent AI swarm called Colour Ceauxdid.\nSpecialty: ${specialty.trim()}\nPersonality: ${personality.trim() || `specialist in ${specialty}`}\nStay in character. Collaborate with the other agents (Red, Blue, Green, Yellow, Purple).`,
      isCustom: true,
      load: 0,
      status: 'idle',
    };

    await saveCustomAgent(agent);
    await loadCustom();
    setName(''); setSpecialty(''); setPersonality('');
    setSelectedColor(CUSTOM_AGENT_COLORS[0]);
    setShowCreate(false);
  }

  async function handleDelete(id: string) {
    Alert.alert('Remove Agent', 'Remove this agent from the swarm?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => { await deleteCustomAgent(id); await loadCustom(); }
      }
    ]);
  }

  const allAgents = [...DEFAULT_AGENTS, ...customAgents];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>AGENT ROSTER</Text>
        <Text style={styles.headerSub}>{allAgents.length}/10 AGENTS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>DEFAULT AGENTS</Text>
        {DEFAULT_AGENTS.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>CUSTOM AGENTS ({customAgents.length}/5)</Text>
          {customAgents.length < 5 && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.addBtnText}>+ ADD</Text>
            </TouchableOpacity>
          )}
        </View>

        {customAgents.length === 0 ? (
          <View style={styles.emptyCustom}>
            <Text style={styles.emptyText}>NO CUSTOM AGENTS</Text>
            <Text style={styles.emptySubText}>Add up to 5 specialized agents to the swarm</Text>
          </View>
        ) : (
          customAgents.map(agent => (
            <AgentCard key={agent.id} agent={agent} onDelete={() => handleDelete(agent.id)} />
          ))
        )}
      </ScrollView>

      {/* Create modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>NEW AGENT</Text>

            <TextInput
              style={styles.input}
              placeholder="Agent name..."
              placeholderTextColor={COLORS.muted}
              value={name}
              onChangeText={setName}
              maxLength={20}
            />
            <TextInput
              style={styles.input}
              placeholder="Specialty (e.g. 'Data Analysis', 'Security')..."
              placeholderTextColor={COLORS.muted}
              value={specialty}
              onChangeText={setSpecialty}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Personality description (optional)..."
              placeholderTextColor={COLORS.muted}
              value={personality}
              onChangeText={setPersonality}
              multiline
            />

            <Text style={styles.colorLabel}>AGENT COLOR</Text>
            <View style={styles.colorGrid}>
              {CUSTOM_AGENT_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.createBtn, { backgroundColor: selectedColor }]} onPress={createAgent}>
                <Text style={styles.createText}>DEPLOY AGENT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function AgentCard({ agent, onDelete }: { agent: SwarmAgent; onDelete?: () => void }) {
  return (
    <View style={[styles.card, { borderLeftColor: agent.colorHex }]}>
      <View style={styles.cardLeft}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardDot, { backgroundColor: agent.colorHex }]} />
          <Text style={[styles.cardName, { color: agent.colorHex }]}>{agent.name.toUpperCase()}</Text>
          {agent.isCustom && <View style={styles.customBadge}><Text style={styles.customBadgeText}>CUSTOM</Text></View>}
        </View>
        <Text style={styles.cardSpecialty}>{agent.specialty}</Text>
        <Text style={styles.cardPersonality}>{agent.personality}</Text>
      </View>
      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  headerSub: { color: COLORS.green, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  content: { padding: 12, gap: 8, paddingBottom: 40 },
  sectionLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  addBtn: {
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.green,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
  },
  addBtnText: { color: COLORS.green, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  card: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderLeftWidth: 3, borderRadius: 10, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  cardLeft: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardDot: { width: 8, height: 8, borderRadius: 4 },
  cardName: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  customBadge: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  customBadgeText: { color: COLORS.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  cardSpecialty: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  cardPersonality: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { color: COLORS.muted, fontSize: 16 },
  emptyCustom: { padding: 24, alignItems: 'center', gap: 6 },
  emptyText: { color: COLORS.muted, fontSize: 11, letterSpacing: 2 },
  emptySubText: { color: COLORS.muted, fontSize: 12, opacity: 0.6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12,
  },
  modalTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  input: {
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 14,
  },
  colorLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  colorGrid: { flexDirection: 'row', gap: 12 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, backgroundColor: COLORS.surfaceElevated, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 10, paddingVertical: 13, alignItems: 'center',
  },
  cancelText: { color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  createBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  createText: { color: '#000', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
});
