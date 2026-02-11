import * as vscode from 'vscode';
import axios from 'axios';

function getConfig() {
  const cfg = vscode.workspace.getConfiguration('claudeUsageMonitor');
  return {
    organizationId: cfg.get<string>('organizationId', ''),
    pollIntervalSeconds: cfg.get<number>('pollIntervalSeconds', 60),
    cookie: cfg.get<string>('cookie', ''),
  };
}

interface UsageBucket {
  utilization: number;
  resets_at: string;
}

interface UsageResponse {
  five_hour: UsageBucket | null;
  seven_day: UsageBucket | null;
  [key: string]: unknown;
}

let statusBarItem: vscode.StatusBarItem;
let pollTimer: ReturnType<typeof setInterval> | undefined;

const USAGE_PAGE_URL = 'https://claude.ai/settings/usage';
const OPEN_USAGE_CMD = 'claude-usage-monitor.openUsagePage';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(OPEN_USAGE_CMD, () => {
      vscode.env.openExternal(vscode.Uri.parse(USAGE_PAGE_URL));
    }),
  );

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  statusBarItem.name = 'Claude Usage';
  statusBarItem.command = OPEN_USAGE_CMD;
  statusBarItem.show();

  startPolling();

  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('claudeUsageMonitor')) {
        startPolling();
      }
    }),
  );
  context.subscriptions.push({
    dispose() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = undefined;
      }
    },
  });
}

function startPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
  }
  fetchAndUpdate();
  pollTimer = setInterval(fetchAndUpdate, getConfig().pollIntervalSeconds * 1000);
}

export function deactivate() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
}

async function fetchAndUpdate() {
  try {
    const { organizationId, cookie } = getConfig();
    if (!organizationId || !cookie) {
      statusBarItem.text = '$(gear) Claude: configure settings';
      statusBarItem.tooltip = 'Set organizationId and cookie in Settings > Claude Code Usage Monitor';
      return;
    }

    const apiUrl = `https://claude.ai/api/organizations/${organizationId}/usage`;
    const res = await axios.get<UsageResponse>(apiUrl, {
      headers: {
        cookie,
        'User-Agent': 'PostmanRuntime/7.51.0',
      },
    });

    updateStatusBar(res.data);
  } catch (err: unknown) {
    const msg = axios.isAxiosError(err)
      ? `HTTP ${err.response?.status ?? 'unknown'}: ${err.message}`
      : err instanceof Error
        ? err.message
        : 'Failed to fetch usage';
    statusBarItem.text = '$(warning) Claude: offline';
    statusBarItem.tooltip = msg;
    statusBarItem.color = undefined;
    statusBarItem.backgroundColor = undefined;
  }
}

function updateStatusBar(data: UsageResponse) {
  const fiveHour = data.five_hour;
  const sevenDay = data.seven_day;

  const fiveHourPct = fiveHour ? Math.round(fiveHour.utilization) : '?';
  const sevenDayPct = sevenDay ? Math.round(sevenDay.utilization) : '?';

  statusBarItem.text = `$(pulse) Claude: 5h ${fiveHourPct}% | 7d ${sevenDayPct}%`;

  // Color based on 5h utilization
  const util = fiveHour?.utilization ?? 0;
  if (util >= 80) {
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
  } else if (util >= 50) {
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
  } else {
    statusBarItem.backgroundColor = undefined;
    statusBarItem.color = undefined;
  }

  // Tooltip with reset times
  const lines: string[] = [];
  if (fiveHour) {
    lines.push(`5-hour: ${fiveHour.utilization}% (resets ${formatTime(fiveHour.resets_at)})`);
  }
  if (sevenDay) {
    lines.push(`7-day: ${sevenDay.utilization}% (resets ${formatTime(sevenDay.resets_at)})`);
  }
  statusBarItem.tooltip = lines.join('\n') || 'No data';
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return 'now';

  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `in ${diffMin}m`;

  const diffHr = Math.floor(diffMin / 60);
  const remainMin = diffMin % 60;
  if (diffHr < 24) return `in ${diffHr}h ${remainMin}m`;

  const diffDays = Math.floor(diffHr / 24);
  const remainHr = diffHr % 24;
  return `in ${diffDays}d ${remainHr}h`;
}
