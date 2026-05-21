# Colour Ceauxdid

A mobile-first multi-agent AI orchestration platform with integrated real-time group chat.

## What it is

Six AI agents — each with a unique identity, behavior, memory, and specialty — collaborating in a shared group chat. Not a chatbot. A coordinated intelligence system.

## Agents

| Agent | Role | Personality |
|-------|------|-------------|
| 🔴 Red | Command & Decision | Decisive, minimal, authoritative |
| 🔵 Blue | Logic & Analysis | Structured, logical, precise |
| 🟢 Green | Building & Execution | Efficient, output-focused |
| 🟡 Yellow | Creative & Expansion | Visionary, exploratory |
| 🟣 Purple | Memory & Oversight | Quiet, corrective |
| 🔴 ToxicLaw | Local Legal Model | Cautious, source-aware |

ToxicLaw is preconfigured for a local Ollama model tag named `toxiclaw`.
Up to 5 additional custom agents supported.

## Features

- Multi-agent group chat with @mentions (`@Red`, `@Blue`, `@ToxicLaw`, `@swarm`)
- Smart message routing — agents respond based on content
- Streaming responses per agent
- Per-agent memory (AsyncStorage)
- Task tracker with agent assignment
- Custom agent creator
- Workflow saving
- Silent mode / focused mode
- Dark terminal aesthetic

## Stack

- React Native + Expo
- OpenRouter, Ollama, and OpenAI-compatible local endpoints
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

## Local ToxicLaw via Ollama/Termux

Run your local model in Termux/Ollama, then add the endpoint in Settings:

```bash
ollama serve
ollama run toxiclaw
```

In the app, add an Ollama endpoint such as `http://127.0.0.1:11434` and keep
ToxicLaw pinned to model `toxiclaw` under Settings -> Per-agent model pinning.
For browser testing from another machine, expose Ollama on the phone LAN IP and
allow the browser origin with Ollama's origin settings.
