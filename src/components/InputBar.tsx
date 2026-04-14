import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Agent } from '../types';

interface Props {
  agents: Agent[];
  onSend: (text: string) => void;
  disabled?: boolean;
}

const QUICK_TAGS = ['@swarm', '@Red', '@Blue', '@Green', '@Yellow', '@Purple'];

export function InputBar({ agents, onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    Keyboard.dismiss();
  };

  const insertTag = (tag: string) => {
    const current = text;
    const spacer = current.length > 0 && !current.endsWith(' ') ? ' ' : '';
    setText(current + spacer + tag + ' ');
    inputRef.current?.focus();
  };

  // Build quick tags: built-ins + custom agents
  const customTags = agents
    .filter(a => !a.isDefault)
    .map(a => `@${a.name}`);
  const allTags = [...QUICK_TAGS, ...customTags];

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={styles.wrapper}>
      {/* Quick tag chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tagsScroll}
        contentContainerStyle={styles.tagsContent}
      >
        {allTags.map(tag => (
          <TouchableOpacity
            key={tag}
            style={styles.tagChip}
            onPress={() => insertTag(tag)}
          >
            <Text style={styles.tagText}>{tag}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message all agents or @mention one..."
          placeholderTextColor="#555"
          multiline
          maxLength={2000}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          editable={!disabled}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendButton, canSend && styles.sendButtonActive]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Text style={[styles.sendIcon, canSend && styles.sendIconActive]}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0D0D1A',
    borderTopWidth: 1,
    borderTopColor: '#1E1E30',
    paddingBottom: 8,
  },
  tagsScroll: {
    maxHeight: 36,
  },
  tagsContent: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  tagChip: {
    backgroundColor: '#1E1E30',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginRight: 4,
  },
  tagText: {
    color: '#8888CC',
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    color: '#FFFFFF',
    fontSize: 15,
    maxHeight: 100,
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#2A2A40',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2A2A40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#4F46E5',
  },
  sendIcon: {
    color: '#555',
    fontSize: 20,
    fontWeight: '700',
  },
  sendIconActive: {
    color: '#FFFFFF',
  },
});
