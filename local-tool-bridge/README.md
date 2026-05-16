# Red Local Tool Bridge

This is a personal local bridge for the Red agent. It gives the app explicit `/shell`
and `/scrape` commands without shipping raw shell access as a normal public feature.

## Start on Windows PowerShell

```powershell
cd C:\Users\redma\OneDrive\Desktop\Colour_Ceauxdid-apk-build-2\Colour_Ceauxdid-apk-build-2\frontend
$env:RED_TOOL_TOKEN = "change-me-red-tool-token"
$env:RED_TOOL_ROOT = "C:\Users\redma\OneDrive\Desktop"
node .\local-tool-bridge\server.mjs
```

## Start on Termux

```sh
cd /path/to/frontend
export RED_TOOL_TOKEN=change-me-red-tool-token
export RED_TOOL_ROOT=$HOME
node local-tool-bridge/server.mjs
```

## Use in chat

```text
/shell pwd
/shell rg "api key" .
/scrape https://example.com
```

## Permission knobs

- `RED_TOOL_ROOT`: highest folder shell commands can run inside.
- `RED_TOOL_ALLOWED_PREFIXES`: comma-separated command prefixes for allowlist mode.
- `RED_TOOL_MODE=full`: disables the prefix/control-operator guard. Use only for a private local bridge.
- `RED_TOOL_TIMEOUT_MS`: command timeout, default `30000`.
- `RED_TOOL_MAX_OUTPUT`: output cap, default `12000`.
- `RED_TOOL_ALLOWED_ORIGINS`: browser origins allowed by CORS, default localhost port 3000.

The app-side URL and token live in `src/config/redToolBridge.ts`.
