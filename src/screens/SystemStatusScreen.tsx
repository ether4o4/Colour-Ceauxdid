import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { OrchestratorConfig } from '../types';

export function SystemStatusScreen() {
  const navigation = useNavigation();
  const { state, updateOrchestratorConfig, clearChat } = useStore();
  const { agents, chatState, agentMemories, orchestratorConfig } = state;

  const activeTasks = chatState.tasks.filter(t => t.status === 'active');
  const completedTasks = chatState.tasks.filter(t => t.status === 'complete');
  const totalMemoryEntries = Object.values(agentMemories).reduce(
    (sum, m) => sum + m.entries.length,
    0,
  );

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Clear all messages and reset the session? Agent memories will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearChat },
      ],
    );
  };

  const toggle = (key: keyof OrchestratorConfig) => (value: boolean) => {
    updateOrchestratorConfig({ [key]: value });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SYSTEM</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* System Stats */}
        <Text style={styles.sectionLabel}>SYSTEM STATUS</Text>
        <View style={styles.statsGrid}>
          <StatTile label="Agents" value={agents.length.toString()} color="#4F46E5" />
          <StatTile label="Active Tasks" value={activeTasks.length.toString()} color="#FDD835" />
          <StatTile label="Completed" value={completedTasks.length.toString()} color="#43A047" />
          <StatTile label="Memory Entries" value={totalMemoryEntries.toString()} color="#8E24AA" />
          <StatTile label="Messages" value={chatState.messages.length.toString()} color="#1E88E5" />
          <StatTile label="Shared Memory" value={chatState.sharedMemory.length.toString()} color="#E53935" />
        </View>

        {/* Agent Status */}
        <Text style={styles.sectionLabel}>AGENT STATUS</Text>
        {agents.map(agent => (
          <View key={agent.id} style={[styles.agentRow, { borderLeftColor: agent.hexColor }]}>
            <View style={[styles.agentDot, { backgroundColor: agent.hexColor }]} />
            <Text style={[styles.agentName, { color: agent.hexColor }]}>{agent.name}</Text>
            <Text style={styles.agentStatus}>{agent.status}</Text>
            <Text style={styles.agentMemory}>
              {agentMemories[agent.id]?.entries.length ?? 0} entries
            </Text>
            {agent.confidenceScore !== undefined && (
              <Text style={styles.agentConf}>
                conf: {Math.round(agent.confidenceScore * 100)}%
              </Text>
            )}
          </View>
        ))}

        {/* Orchestrator Config */}
        <Text style={styles.sectionLabel}>ORCHESTRATION CONFIG</Text>
        <View style={styles.configCard}>
          <ConfigToggle
            label="Confidence Scoring"
            description="Agents rate their own response confidence"
            value={orchestratorConfig.confidenceScoringEnabled}
            onToggle={toggle('confidenceScoringEnabled')}
          />
          <ConfigToggle
            label="Debate Mode"
            description="Agents argue before Red decides (slower, higher quality)"
            value={orchestratorConfig.debateModeEnabled}
            onToggle={toggle('debateModeEnabled')}
          />
          <ConfigToggle
            label="Priority Interrupt"
            description="Urgent messages cut in immediately"
            value={orchestratorConfig.priorityInterruptEnabled}
            onToggle={toggle('priorityInterruptEnabled')}
          />
          <ConfigToggle
            label="Visible Summons"
            description="Show when agents summon each other"
            value={orchestratorConfig.summonVisibility === 'visible'}
            onToggle={v => updateOrchestratorConfig({ summonVisibility: v ? 'visible' : 'silent' })}
          />

          <View style={styles.configRow}>
            <View style={styles.configLabelBlock}>
              <Text style={styles.configLabel}>Mode</Text>
              <Text style={styles.configDescription}>Current orchestration mode</Text>
            </View>
            <View style={styles.modeButtons}>
              {(['normal', 'debate', 'swarm'] as OrchestratorConfig['mode'][]).map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeBtn, orchestratorConfig.mode === mode && styles.modeBtnActive]}
                  onPress={() => updateOrchestratorConfig({ mode })}
                >
                  <Text style={[styles.modeBtnText, orchestratorConfig.mode === mode && styles.modeBtnTextActive]}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Active Tasks */}
        {activeTasks.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>ACTIVE TASKS</Text>
            {activeTasks.map(task => (
              <View key={task.id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskType}>{task.type.toUpperCase()}</Text>
                  <Text style={styles.taskStatus}>{task.status}</Text>
                </View>
                <Text style={styles.taskDesc}>{task.description}</Text>
                <Text style={styles.taskAgents}>
                  Agents: {task.assignedAgentIds
                    .map(id => agents.find(a => a.id === id)?.name ?? id)
                    .join(', ')}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Danger Zone */}
        <Text style={styles.sectionLabel}>SESSION</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearChat}>
          <Text style={styles.dangerBtnText}>Clear Chat History</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statTile, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface ConfigToggleProps {
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}

function ConfigToggle({ label, description, value, onToggle }: ConfigToggleProps) {
  return (
    <View style={styles.configRow}>
      <View style={styles.configLabelBlock}>
        <Text style={styles.configLabel}>{label}</Text>
        <Text style={styles.configDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#2A2A40', true: '#4F46E5' }}
        thumbColor={value ? '#FFF' : '#666'}
      />
    </View>
  );
}

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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statTile: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: '#0D0D1A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 2,
  },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { color: '#555', fontSize: 11, marginTop: 2, textAlign: 'center' },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D1A',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    gap: 8,
    marginBottom: 4,
  },
  agentDot: { width: 6, height: 6, borderRadius: 3 },
  agentName: { fontSize: 13, fontWeight: '700', flex: 1 },
  agentStatus: { color: '#555', fontSize: 11 },
  agentMemory: { color: '#444', fontSize: 11 },
  agentConf: { color: '#444', fontSize: 11 },
  configCard: {
    backgroundColor: '#0D0D1A',
    borderRadius: 12,
    padding: 4,
    gap: 0,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  configLabelBlock: { flex: 1, gap: 2 },
  configLabel: { color: '#DDD', fontSize: 14, fontWeight: '600' },
  configDescription: { color: '#555', fontSize: 12 },
  modeButtons: { flexDirection: 'row', gap: 6 },
  modeBtn: {
    backgroundColor: '#1E1E30',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modeBtnActive: { backgroundColor: '#4F46E5' },
  modeBtnText: { color: '#666', fontSize: 12 },
  modeBtnTextActive: { color: '#FFF', fontWeight: '600' },
  taskCard: {
    backgroundColor: '#0D0D1A',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginBottom: 4,
  },
  taskHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskType: { color: '#8888CC', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  taskStatus: {
    backgroundColor: '#FDD835',
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  taskDesc: { color: '#888', fontSize: 13, lineHeight: 18 },
  taskAgents: { color: '#555', fontSize: 11 },
  dangerBtn: {
    backgroundColor: '#2A0A0A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A1010',
    marginBottom: 20,
  },
  dangerBtnText: { color: '#E53935', fontSize: 15, fontWeight: '700' },
});
