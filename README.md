# Claude Code Usage Monitor

A VS Code extension that displays your Claude Code API usage in the status bar.

![Status Bar Preview](https://img.shields.io/badge/Claude-5h%2042%25%20%7C%207d%2018%25-blue?style=flat-square)

## Features

- **Real-time usage display** — Shows 5-hour and 7-day utilization percentages in the status bar
- **Color-coded alerts** — Status bar turns yellow at 50% and red at 80% usage
- **Reset time tooltips** — Hover to see when each usage window resets
- **Click to open** — Click the status bar item to open the Claude usage page
- **Live config reload** — Change settings without restarting VS Code

## Setup

### 1. Install the extension

```bash
# Clone and build
git clone https://github.com/ryan-shen/claude-code-usage-monitor.git
cd claude-code-usage-monitor
npm install
npm run compile

# Package and install
npx @vscode/vsce package
code --install-extension claude-code-usage-monitor-0.0.1.vsix
```

### 2. Configure settings

Open VS Code Settings (`Cmd+,`) and search for **Claude Code Usage Monitor**:

| Setting | Description |
|---------|-------------|
| `claudeUsageMonitor.organizationId` | Your Claude organization ID (from the claude.ai URL) |
| `claudeUsageMonitor.cookie` | Cookie header value for claude.ai API authentication |
| `claudeUsageMonitor.pollIntervalSeconds` | Polling interval in seconds (default: 60, minimum: 10) |

### Finding your Organization ID and Cookie

1. Open [claude.ai](https://claude.ai) in your browser
2. Open DevTools (`F12`) → Network tab
3. Navigate to any page and find a request to `claude.ai/api/...`
4. The **Organization ID** is in the URL path: `/api/organizations/{orgId}/...`
5. The **Cookie** is in the request headers — copy the full `Cookie` header value

## Development

```bash
npm install
npm run watch    # Auto-recompile on changes
# Press F5 in VS Code to launch Extension Development Host
```
