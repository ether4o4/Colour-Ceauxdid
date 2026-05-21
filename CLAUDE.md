# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Project Overview

Colour Ceauxdid is a mobile-first multi-agent AI orchestration app built with **React Native 0.81.5 + Expo 54**. It coordinates five built-in agents (Red, Blue, Green, Yellow, Purple) plus user-defined custom agents in a shared chat surface. All persistence is device-local via AsyncStorage; there is **no backend** in this repo.

For the broader product redesign that introduced project-scoped chats, individual agent threads, saved sessions, and the responsive sidebar, see `CHAT_HUB_CHANGES.md`.

## Commands

```bash
npm install               # install dependencies
npm start                 # expo start (interactive: a/i/w to launch platform)
npm run android           # expo run:android (requires Android SDK)
npm run ios               # expo run:ios (requires Xcode)
npm run web               # expo start --web
```

There is no test runner, linter, or type-check script configured. Run `npx tsc --noEmit` to type-check manually (TypeScript strict mode is on).

### Building an Android APK

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview   # APK for internal testing
```

Profiles in `eas.json`: `development` (Expo dev client), `preview` (APK), `production` (release APK).

## Architecture

Entry: `index.ts` registers `App.tsx`, which mounts `<Navigation />` from `src/navigation/index.tsx`. Navigation is a 4-tab bottom bar: **Chat**, **Tasks**, **Agents**, **Settings**.

```
src/
  agents/          Built-in and template agent definitions
    config.ts      DEFAULT_AGENTS (Red/Blue/Green/Yellow/Purple): system prompts, colors, temperature
    templates.ts   AGENT_TEMPLATES used when creating custom agents (Researcher, Strategist, etc.)
  components/      Reusable UI (AgentStrip, ChatMainArea, MessageBubble, SidebarNavigation)
  navigation/      Bottom-tab + native-stack setup
  screens/         ChatHub, TasksScreen, AgentsScreen, SettingsScreen
  store/           AsyncStorage wrapper (all keys prefixed `cc_`)
  types/           Core models: SwarmAgent, SwarmMessage, Task, Project, SavedChat, ApiConfig
  utils/
    api.ts         LLM client (OpenRouter / OpenAI / Anthropic / custom endpoint)
    theme.ts       COLORS and FONTS (single source of truth — no inline color literals)
```

### Key conventions

- **State**: per-screen React state + AsyncStorage for persistence. No Redux / Context.
- **Per-thread message keys**: `src/store/index.ts` namespaces messages by thread (`project_<id>`, `agent_<id>`, or global). History is capped at 500 messages per thread and trimmed on insert. Preserve this when adding new chat surfaces.
- **Theme tokens**: import colors and fonts from `src/utils/theme.ts`. Do not hard-code hex values in components.
- **Styles**: use `StyleSheet.create({...})` blocks at the bottom of each component.
- **No path aliases**: imports are relative.
- **Provider-agnostic LLM calls**: `src/utils/api.ts` exposes `MissingApiKeyError`, `resolveConfig()`, `authHeaders()`, and `buildPayload()`. When adding a new provider, extend the `ApiConfig.provider` union in `src/types/index.ts` and add branches in `authHeaders` / `buildPayload`.
- **Agent personality**: temperature is set per agent in `src/agents/config.ts` (Red 0.3 decisive, Yellow 0.9 creative, others 0.7). Honor this when wiring new agents.

### Responsive layout

`ChatHub.tsx` switches between sidebar (window width > 800) and tabbed picker layouts on smaller screens. New top-level surfaces in the chat hub should respect the same breakpoint.

## Configuration

Expo config lives in `app.json` (slug `colour-ceauxdid`, bundle/package `com.ceauxdid.colour`, dark UI, `expo-font` plugin, INTERNET permission only). `tsconfig.json` extends `expo/tsconfig.base` with strict mode.

Optional environment variables (read by `src/utils/api.ts` as a fallback when no in-app API config is set):

```
EXPO_PUBLIC_OPENROUTER_API_KEY     # default API key for dev builds
EXPO_PUBLIC_OPENROUTER_BASE_URL    # default base URL
```

User-supplied keys from the Settings screen always win; nothing is hard-coded.

## Working in this repo

- Prefer editing existing files; the structure is small and well-organized.
- Run `npx tsc --noEmit` after non-trivial type changes — strict mode catches a lot.
- When adding agent behavior or prompts, update `src/agents/config.ts` (built-ins) or `src/agents/templates.ts` (custom-agent presets) — never inline prompts in components or screens.
- External integrations shown in the sidebar (GitHub, Drive) are UI mockups; no OAuth flow exists yet.
- AsyncStorage is device-local — no cross-device sync, no cloud backup. Don't assume otherwise.
