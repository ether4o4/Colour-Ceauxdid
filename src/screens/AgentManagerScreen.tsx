import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import {
  AGENT_HEX_COLORS,
  AVAILABLE_COLORS,
  BEHAVIOR_STYLE_LABELS,
  SPECIALIZATION_TAG_LABELS,
} from '../constants/agents';
import { Agent, BehaviorStyle, SpecializationTag } from '../types';

const BEHAVIOR_STYLES = Object.keys(BEHAVIOR_STYLE_LABELS) as BehaviorStyle[];
const SPEC_TAGS = Object.keys(SPECIALIZATION_TAG_LABELS) as SpecializationTag[];
const MAX_TOTAL_AGENTS = 10;
const MAX_CUSTOM_AGENTS = 5;

export function AgentManagerScreen() {
  const navigation = useNavigation();
  const { state, addCustomAgent, updateAgent, removeCustomAgent, muteAgent, disableAgent, resetAgentMemory } = useStore();
  const { agents } = state;

  const defaultAgents = agents.filter(a => a.isDefault);
  const customAgents = agents.filter(a => !a.isDefault);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('Orange');
  const [formRole, setFormRole] = useState('');
  const [formBehavior, setFormBehavior] = useState<BehaviorStyle>('concise');
  const [formTags, setFormTags] = useState<SpecializationTag[]>([]);

  const usedColors = agents.map(a => a.color);
  const availableColors = AVAILABLE_COLORS.filter(c => !usedColors.includes(c) || c === formColor);

  const resetForm = () => {
    setFormName('');
    setFormColor(availableColors[0] ?? 'Orange');
    setFormRole('');
    setFormBehavior('concise');
    setFormTags([]);
    setEditingAgent(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormName(agent.name);
    setFormColor(agent.color);
    setFormRole(agent.roleDescription);
    setFormBehavior(agent.behaviorStyle);
    setFormTags([...agent.specializationTags]);
    setShowCreateModal(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      Alert.alert('Name required', 'Please enter a name for the agent.');
      return;
    }
    if (!formRole.trim()) {
      Alert.alert('Role required', 'Please describe the agent\'s role.');
      return;
    }
    const nameConflict = agents.find(
      a => a.name.toLowerCase() === formName.toLowerCase() && a.id !== editingAgent?.id,
    );
    if (nameConflict) {
      Alert.alert('Name taken', 'An agent with this name already exists.');
      return;
    }

    if (editingAgent) {
      updateAgent(editingAgent.id, {
        name: formName.trim(),
        color: formColor,
        hexColor: AGENT_HEX_COLORS[formColor] ?? '#888',
        roleDescription: formRole.trim(),
        behaviorStyle: formBehavior,
        specializationTags: formTags,
      });
    } else {
      addCustomAgent({
        name: formName.trim(),
        color: formColor,
        hexColor: AGENT_HEX_COLORS[formColor] ?? '#888',
        role: 'custom',
        roleDescription: formRole.trim(),
        behaviorStyle: formBehavior,
        specializationTags: formTags,
        personalityType: 'Custom',
      });
    }
    setShowCreateModal(false);
    resetForm();
  };

  const handleDelete = (agent: Agent) => {
    Alert.alert(
      'Remove Agent',
      `Remove ${agent.name} from the system? This will also delete their memory.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeCustomAgent(agent.id),
        },
      ],
    );
  };

  const handleResetMemory = (agent: Agent) => {
    Alert.alert(
      'Reset Memory',
      `Clear all memory for ${agent.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => resetAgentMemory(agent.id),
        },
      ],
    );
  };

  const toggleTag = (tag: SpecializationTag) => {
    setFormTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    );
  };

  const canCreate = customAgents.length < MAX_CUSTOM_AGENTS && agents.length < MAX_TOTAL_AGENTS;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AGENTS</Text>
        {canCreate ? (
          <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
            <Text style={styles.createText}>+ New</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.limitBadge}>
            <Text style={styles.limitText}>Max {MAX_TOTAL_AGENTS}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Default agents */}
        <Text style={styles.sectionLabel}>DEFAULT AGENTS</Text>
        {defaultAgents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onMute={muted => muteAgent(agent.id, muted)}
            onDisable={disabled => disableAgent(agent.id, disabled)}
            onResetMemory={() => handleResetMemory(agent)}
            canDelete={false}
          />
        ))}

        {/* Custom agents */}
        <Text style={styles.sectionLabel}>
          CUSTOM AGENTS ({customAgents.length}/{MAX_CUSTOM_AGENTS})
        </Text>
        {customAgents.length === 0 ? (
          <Text style={styles.emptyText}>No custom agents yet. Create up to 5.</Text>
        ) : (
          customAgents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onMute={muted => muteAgent(agent.id, muted)}
              onDisable={disabled => disableAgent(agent.id, disabled)}
              onResetMemory={() => handleResetMemory(agent)}
              onEdit={() => openEdit(agent)}
              onDelete={() => handleDelete(agent)}
              canDelete
            />
          ))
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {editingAgent ? `Edit ${editingAgent.name}` : 'New Agent'}
            </Text>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="Agent name"
                placeholderTextColor="#555"
                maxLength={24}
              />

              {/* Color */}
              <Text style={styles.fieldLabel}>Color Identity</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
                {availableColors.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: AGENT_HEX_COLORS[color] ?? '#888' },
                      formColor === color && styles.colorSwatchSelected,
                    ]}
                    onPress={() => setFormColor(color)}
                  >
                    <Text style={styles.colorLabel}>{color}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Role */}
              <Text style={styles.fieldLabel}>Role Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formRole}
                onChangeText={setFormRole}
                placeholder="Describe what this agent does..."
                placeholderTextColor="#555"
                multiline
                maxLength={200}
              />

              {/* Behavior Style */}
              <Text style={styles.fieldLabel}>Behavior Style</Text>
              <View style={styles.chipRow}>
                {BEHAVIOR_STYLES.map(style => (
                  <TouchableOpacity
                    key={style}
                    style={[styles.chip, formBehavior === style && styles.chipSelected]}
                    onPress={() => setFormBehavior(style)}
                  >
                    <Text style={[styles.chipText, formBehavior === style && styles.chipTextSelected]}>
                      {BEHAVIOR_STYLE_LABELS[style]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Specialization Tags */}
              <Text style={styles.fieldLabel}>Specialization Tags (optional)</Text>
              <View style={styles.chipRow}>
                {SPEC_TAGS.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.chip, formTags.includes(tag) && styles.chipSelected]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.chipText, formTags.includes(tag) && styles.chipTextSelected]}>
                      {SPECIALIZATION_TAG_LABELS[tag]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Preview */}
              {formName.trim() && (
                <View style={styles.preview}>
                  <Text style={styles.previewLabel}>PREVIEW</Text>
                  <View style={[styles.previewBubble, { borderLeftColor: AGENT_HEX_COLORS[formColor] ?? '#888' }]}>
                    <View style={styles.previewHeader}>
                      <View style={[styles.previewDot, { backgroundColor: AGENT_HEX_COLORS[formColor] ?? '#888' }]} />
                      <Text style={[styles.previewName, { color: AGENT_HEX_COLORS[formColor] ?? '#888' }]}>
                        {formName}
                      </Text>
                    </View>
                    <Text style={styles.previewText}>
                      {formRole.trim() || 'Custom agent ready to assist.'}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowCreateModal(false); resetForm(); }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>{editingAgent ? 'Save' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── AgentCard ────────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: Agent;
  canDelete: boolean;
  onMute: (muted: boolean) => void;
  onDisable: (disabled: boolean) => void;
  onResetMemory: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function AgentCard({ agent, canDelete, onMute, onDisable, onResetMemory, onEdit, onDelete }: AgentCardProps) {
  const isMuted = agent.status === 'muted';
  const isDisabled = agent.status === 'disabled';

  return (
    <View style={[styles.agentCard, { borderLeftColor: agent.hexColor }]}>
      <View style={styles.agentCardHeader}>
        <View style={[styles.agentDot, { backgroundColor: agent.hexColor }]} />
        <Text style={[styles.agentCardName, { color: agent.hexColor }]}>{agent.name}</Text>
        <View style={styles.agentCardBadge}>
          <Text style={styles.agentCardBadgeText}>{agent.personalityType}</Text>
        </View>
      </View>

      <Text style={styles.agentCardRole}>{agent.roleDescription}</Text>
      <Text style={styles.agentCardStyle}>Style: {agent.behaviorStyle}</Text>
      {agent.specializationTags.length > 0 && (
        <Text style={styles.agentCardTags}>Tags: {agent.specializationTags.join(', ')}</Text>
      )}

      <View style={styles.agentCardActions}>
        <TouchableOpacity
          style={[styles.cardAction, isMuted && styles.cardActionActive]}
          onPress={() => onMute(!isMuted)}
        >
          <Text style={styles.cardActionText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cardAction, isDisabled && styles.cardActionActive]}
          onPress={() => onDisable(!isDisabled)}
        >
          <Text style={styles.cardActionText}>{isDisabled ? 'Enable' : 'Disable'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cardAction} onPress={onResetMemory}>
          <Text style={styles.cardActionText}>Reset Memory</Text>
        </TouchableOpacity>
        {onEdit && (
          <TouchableOpacity style={styles.cardAction} onPress={onEdit}>
            <Text style={styles.cardActionText}>Edit</Text>
          </TouchableOpacity>
        )}
        {canDelete && onDelete && (
          <TouchableOpacity style={[styles.cardAction, styles.cardActionDanger]} onPress={onDelete}>
            <Text style={styles.cardActionTextDanger}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A15' },
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
  backBtn: { padding: 4 },
  backText: { color: '#8888CC', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  createBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  createText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  limitBadge: {
    backgroundColor: '#1E1E30',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  limitText: { color: '#555', fontSize: 12 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },

  sectionLabel: {
    color: '#444',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: { color: '#444', fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },

  agentCard: {
    backgroundColor: '#0D0D1A',
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 14,
    gap: 6,
    marginBottom: 6,
  },
  agentCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  agentDot: { width: 8, height: 8, borderRadius: 4 },
  agentCardName: { fontSize: 15, fontWeight: '700' },
  agentCardBadge: {
    backgroundColor: '#1E1E30',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 'auto',
  },
  agentCardBadgeText: { color: '#666', fontSize: 10, letterSpacing: 0.5 },
  agentCardRole: { color: '#888', fontSize: 13, lineHeight: 18 },
  agentCardStyle: { color: '#555', fontSize: 12 },
  agentCardTags: { color: '#555', fontSize: 12 },
  agentCardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  cardAction: {
    backgroundColor: '#1E1E30',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cardActionActive: { backgroundColor: '#2A2A40' },
  cardActionDanger: { backgroundColor: '#2A0A0A' },
  cardActionText: { color: '#8888CC', fontSize: 12, fontWeight: '600' },
  cardActionTextDanger: { color: '#E53935', fontSize: 12, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0D0D1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20,
    gap: 16,
  },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  modalScroll: { maxHeight: 500 },
  fieldLabel: { color: '#666', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 6, marginTop: 10 },
  textInput: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2A2A40',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  colorRow: { maxHeight: 60 },
  colorSwatch: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  colorSwatchSelected: { borderWidth: 2, borderColor: '#FFF' },
  colorLabel: { color: '#FFF', fontSize: 12, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#1E1E30',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: { backgroundColor: '#4F46E5' },
  chipText: { color: '#666', fontSize: 13 },
  chipTextSelected: { color: '#FFF', fontWeight: '600' },
  preview: { marginTop: 16 },
  previewLabel: { color: '#444', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  previewBubble: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 12,
    gap: 4,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewDot: { width: 6, height: 6, borderRadius: 3 },
  previewName: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  previewText: { color: '#888', fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1E1E30',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { color: '#666', fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
