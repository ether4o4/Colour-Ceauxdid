import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { StoredFile } from '../types';

export function StorageViewerScreen() {
  const navigation = useNavigation();
  const { state, deleteFile, createFile } = useStore();
  const { chatState, agents } = state;
  const { storedFiles } = chatState;

  const getAgentName = (id: string) => {
    if (id === 'user') return 'You';
    return agents.find(a => a.id === id)?.name ?? id;
  };

  const getAgentColor = (id: string) => {
    if (id === 'user') return '#FFF';
    return agents.find(a => a.id === id)?.hexColor ?? '#888';
  };

  const handleDelete = (file: StoredFile) => {
    Alert.alert('Delete File', `Delete "${file.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFile(file.id) },
    ]);
  };

  const handleCreateSample = () => {
    createFile({
      name: 'session-notes.txt',
      content: `Session Notes\n${'─'.repeat(40)}\nCreated: ${new Date().toLocaleString()}\n\nThis file was created manually from the Storage Viewer.`,
      createdBy: 'user',
      tags: ['notes'],
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>STORAGE</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleCreateSample}>
          <Text style={styles.addText}>+ Note</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsRow}>
          <StatCard label="Files" value={storedFiles.length.toString()} />
          <StatCard label="Messages" value={chatState.messages.length.toString()} />
          <StatCard label="Tasks" value={chatState.tasks.length.toString()} />
          <StatCard label="Shared Memory" value={chatState.sharedMemory.length.toString()} />
        </View>

        <Text style={styles.sectionLabel}>STORED FILES</Text>
        {storedFiles.length === 0 ? (
          <Text style={styles.emptyText}>No files stored yet. Agents can create files during tasks.</Text>
        ) : (
          storedFiles.map(file => (
            <FileCard
              key={file.id}
              file={file}
              agentName={getAgentName(file.createdBy)}
              agentColor={getAgentColor(file.createdBy)}
              onDelete={() => handleDelete(file)}
            />
          ))
        )}

        <Text style={styles.sectionLabel}>SHARED MEMORY</Text>
        {chatState.sharedMemory.length === 0 ? (
          <Text style={styles.emptyText}>Shared memory is empty. Red agent decisions will appear here.</Text>
        ) : (
          chatState.sharedMemory.slice().reverse().map(entry => (
            <View key={entry.id} style={styles.memoryEntry}>
              <View style={styles.memoryEntryHeader}>
                <Text style={[styles.memorySource, { color: getAgentColor(entry.authorAgentId) }]}>
                  {getAgentName(entry.authorAgentId)}
                </Text>
                <Text style={styles.memoryTimestamp}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </Text>
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceBadgeText}>{entry.source.replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.memoryContent}>{entry.content}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface FileCardProps {
  file: StoredFile;
  agentName: string;
  agentColor: string;
  onDelete: () => void;
}

function FileCard({ file, agentName, agentColor, onDelete }: FileCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <View style={styles.fileCard}>
      <TouchableOpacity onPress={() => setExpanded(e => !e)} style={styles.fileCardHeader}>
        <Text style={styles.fileName}>{file.name}</Text>
        <Text style={styles.fileExpand}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      <View style={styles.fileMeta}>
        <Text style={[styles.fileAuthor, { color: agentColor }]}>by {agentName}</Text>
        <Text style={styles.fileDate}>{new Date(file.createdAt).toLocaleString()}</Text>
      </View>
      {file.tags.length > 0 && (
        <Text style={styles.fileTags}>{file.tags.join(' · ')}</Text>
      )}
      {expanded && (
        <Text style={styles.fileContent}>{file.content}</Text>
      )}
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
        <Text style={styles.deleteBtnText}>Delete</Text>
      </TouchableOpacity>
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
  addBtn: {
    backgroundColor: '#1E1E30',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addText: { color: '#8888CC', fontSize: 13, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCard: {
    flex: 1,
    backgroundColor: '#0D0D1A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#555', fontSize: 11, marginTop: 2 },
  sectionLabel: {
    color: '#444',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: { color: '#444', fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
  fileCard: {
    backgroundColor: '#0D0D1A',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginBottom: 6,
  },
  fileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fileName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  fileExpand: { color: '#555', fontSize: 12 },
  fileMeta: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  fileAuthor: { fontSize: 12, fontWeight: '600' },
  fileDate: { color: '#444', fontSize: 11 },
  fileTags: { color: '#444', fontSize: 11 },
  fileContent: {
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    padding: 10,
    color: '#888',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
    marginTop: 4,
  },
  deleteBtn: { alignSelf: 'flex-start', marginTop: 4 },
  deleteBtnText: { color: '#E53935', fontSize: 12, fontWeight: '600' },
  memoryEntry: {
    backgroundColor: '#0D0D1A',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 6,
  },
  memoryEntryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memorySource: { fontSize: 12, fontWeight: '700' },
  memoryTimestamp: { color: '#444', fontSize: 11 },
  sourceBadge: {
    backgroundColor: '#1E1E30',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 'auto',
  },
  sourceBadgeText: { color: '#555', fontSize: 10 },
  memoryContent: { color: '#666', fontSize: 13, lineHeight: 18 },
});
