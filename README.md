# Colour Ceauxdid

A mobile-first multi-agent AI orchestration platform with integrated real-time group chat.

## What it is

Five AI agents — each with a unique identity, behavior, memory, and specialty — collaborating in a shared group chat. Not a chatbot. A coordinated intelligence system.

## Agents

| Agent | Role | Personality |
|-------|------|-------------|
| 🔴 Red | Command & Decision | Decisive, minimal, authoritative |
| 🔵 Blue | Logic & Analysis | Structured, logical, precise |
| 🟢 Green | Building & Execution | Efficient, output-focused |
| 🟡 Yellow | Creative & Expansion | Visionary, exploratory |
| 🟣 Purple | Memory & Oversight | Quiet, corrective |

Up to 5 additional custom agents supported.

## Features

- Multi-agent group chat with @mentions (`@Red`, `@Blue`, `@swarm`)
- Smart message routing — agents respond based on content
- Per-project and per-agent chat history (each thread is its own scrollback)
- Per-agent memory (AsyncStorage)
- Task tracker with agent assignment
- Custom agent creator
- Workflow saving
- Silent mode / focused mode
- In-app API key + provider switching (OpenRouter / OpenAI / Anthropic / custom)
- Dark terminal aesthetic

## Stack

- React Native + Expo
- OpenRouter (free models — Llama 3.1 8B)
- AsyncStorage for persistence
- React Navigation (bottom tabs + stack)
- EAS Build for APK

## Setup

```bash
npm install
npx expo start
```

## Build APK

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

## API Key

Open **Settings → API & MODEL** in the app, pick a provider (OpenRouter, OpenAI, Anthropic, or Custom), paste your key, and tap **TEST** then **SAVE**. The key is persisted via AsyncStorage on the device — there are no hardcoded keys in source.

For dev / EAS builds you can also seed defaults with `.env`:
```bash
EXPO_PUBLIC_OPENROUTER_API_KEY=your-key-here
EXPO_PUBLIC_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1   # optional
```

In-app settings always override env defaults.

### Local LLM (Ollama / vLLM)

Pick the **Custom** provider and point Base URL at your OpenAI-compatible endpoint, e.g. `http://192.168.1.50:11434/v1` for Ollama. Use any non-empty string for the API key (Ollama doesn't validate it).
