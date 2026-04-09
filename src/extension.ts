import * as path from 'path';
import * as vscode from 'vscode';
import {
  identityKey,
  MANAGED_WORKBENCH_KEYS,
  normalizePath,
  resolveWorkspaceTheme,
  type ManagedWorkbenchKey,
  type ResolvedWorkbenchColors,
  type TintRule,
  type UserTintConfig,
  type WorkspaceColorsConfig,
  type WorkspaceIdentity,
} from './resolveWorkspaceTheme';

const SNAPSHOT_KEY = 'userTint.managedColorSnapshot';
const CFG = 'userTint';

function buildIdentity(): WorkspaceIdentity {
  const wf = vscode.workspace.workspaceFile;
  const folders = vscode.workspace.workspaceFolders;
  const first = folders?.[0];
  return {
    folderPath: first?.uri.fsPath,
    folderBasename: first ? path.basename(first.uri.fsPath) : undefined,
    workspaceFilePath: wf?.fsPath,
    workspaceFileBasename: wf ? path.basename(wf.fsPath) : undefined,
  };
}

function readUserTintConfig(): UserTintConfig {
  const cfg = vscode.workspace.getConfiguration(CFG);
  return {
    rules: cfg.get<TintRule[]>('rules', []),
    hashFallback: cfg.get<boolean>('hashFallback', false),
    hashSaturation: cfg.get<number>('hashSaturation', 42),
    hashLightness: cfg.get<number>('hashLightness', 32),
    applyActivityBar: cfg.get<boolean>('applyActivityBar', false),
    allowWorkspaceOverride: cfg.get<boolean>('allowWorkspaceOverride', false),
  };
}

function readWorkspaceColorsOverride(): WorkspaceColorsConfig {
  const cfg = vscode.workspace.getConfiguration(CFG);
  const raw = cfg.get<WorkspaceColorsConfig>('workspaceColors', {});
  return raw && typeof raw === 'object' ? raw : {};
}

function normalizeHex(input: string): string | undefined {
  const t = input.trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(t);
  if (!m) {
    return undefined;
  }
  return `#${m[1].toLowerCase()}`;
}

type Snapshot = Partial<Record<ManagedWorkbenchKey, string | undefined>>;

async function ensureSnapshot(
  context: vscode.ExtensionContext,
  current: Record<string, unknown>,
): Promise<Snapshot> {
  const existing = context.workspaceState.get<Snapshot | undefined>(SNAPSHOT_KEY);
  if (existing !== undefined) {
    return existing;
  }
  const snap: Snapshot = {};
  for (const key of MANAGED_WORKBENCH_KEYS) {
    const v = current[key];
    if (typeof v === 'string') {
      snap[key] = v;
    }
  }
  await context.workspaceState.update(SNAPSHOT_KEY, snap);
  return snap;
}

function mergeWorkbenchColors(
  base: Record<string, unknown>,
  resolved: ResolvedWorkbenchColors,
): Record<string, unknown> {
  const next = { ...base };
  for (const [k, v] of Object.entries(resolved)) {
    if (v !== undefined) {
      next[k] = v;
    }
  }
  return next;
}

function stripManagedKeys(
  current: Record<string, unknown>,
  snapshot: Snapshot | undefined,
): Record<string, unknown> {
  const next = { ...current };
  if (snapshot === undefined) {
    for (const key of MANAGED_WORKBENCH_KEYS) {
      delete next[key];
    }
    return next;
  }
  for (const key of MANAGED_WORKBENCH_KEYS) {
    if (snapshot[key] !== undefined) {
      next[key] = snapshot[key];
    } else {
      delete next[key];
    }
  }
  return next;
}

export async function applyUserTint(
  context: vscode.ExtensionContext,
): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return;
  }

  const identity = buildIdentity();
  const user = readUserTintConfig();
  const workspaceOverride = readWorkspaceColorsOverride();
  const resolved = resolveWorkspaceTheme(identity, user, workspaceOverride);

  if (Object.keys(resolved).length === 0) {
    return;
  }

  const workbench = vscode.workspace.getConfiguration('workbench');
  const current =
    (workbench.get('colorCustomizations') as Record<string, unknown>) ?? {};

  await ensureSnapshot(context, current);

  const merged = mergeWorkbenchColors(current, resolved);
  await workbench.update(
    'colorCustomizations',
    merged,
    vscode.ConfigurationTarget.Workspace,
  );
}

export async function resetUserTint(
  context: vscode.ExtensionContext,
): Promise<void> {
  const snapshot = context.workspaceState.get<Snapshot | undefined>(SNAPSHOT_KEY);
  const workbench = vscode.workspace.getConfiguration('workbench');
  const current =
    (workbench.get('colorCustomizations') as Record<string, unknown>) ?? {};
  const restored = stripManagedKeys(current, snapshot);
  await workbench.update(
    'colorCustomizations',
    restored,
    vscode.ConfigurationTarget.Workspace,
  );
  await context.workspaceState.update(SNAPSHOT_KEY, undefined);
}

async function setColorForWorkspace(): Promise<void> {
  const identity = buildIdentity();
  const key = identityKey(identity);
  if (!key) {
    vscode.window.showWarningMessage('User Tint: open a folder or workspace file first.');
    return;
  }

  type MatchPick = vscode.QuickPickItem & {
    match: 'basename' | 'pathPrefix' | 'workspaceFileBasename';
  };

  const matchKind = await vscode.window.showQuickPick<MatchPick>(
    [
      {
        label: 'Folder basename',
        description: identity.folderBasename ?? '',
        match: 'basename',
      },
      {
        label: 'Path prefix',
        description: identity.folderPath
          ? normalizePath(identity.folderPath)
          : key,
        match: 'pathPrefix',
      },
      {
        label: 'Workspace file basename',
        description: identity.workspaceFileBasename ?? '(single-folder window)',
        match: 'workspaceFileBasename',
      },
    ],
    { title: 'User Tint: match this workspace by' },
  );
  if (!matchKind) {
    return;
  }

  let pattern = '';
  if (matchKind.match === 'basename') {
    pattern = identity.folderBasename ?? '';
  } else if (matchKind.match === 'pathPrefix') {
    pattern = identity.folderPath ? normalizePath(identity.folderPath) : key;
  } else {
    pattern = identity.workspaceFileBasename ?? '';
  }

  if (!pattern) {
    vscode.window.showErrorMessage('User Tint: no pattern available for that match type.');
    return;
  }

  const hexInput = await vscode.window.showInputBox({
    title: 'Title bar color (hex)',
    prompt: 'e.g. #1e3a5f',
    value: '#2d6cdf',
    validateInput: (v) => {
      if (!normalizeHex(v)) {
        return 'Use a 6-digit hex color, with or without #';
      }
      return undefined;
    },
  });
  if (!hexInput) {
    return;
  }
  const bg = normalizeHex(hexInput);
  if (!bg) {
    return;
  }

  const cfg = vscode.workspace.getConfiguration(CFG);
  const rules = cfg.get<TintRule[]>('rules', []);
  const nextRules = rules.filter(
    (r) => !(r.match === matchKind.match && r.pattern === pattern),
  );
  nextRules.push({
    match: matchKind.match,
    pattern,
    colors: { titleBarActiveBackground: bg },
  });

  await cfg.update('rules', nextRules, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(
    `User Tint: saved rule (${matchKind.match}: ${pattern}). Run "User Tint: Apply theme" if auto-apply is off.`,
  );
}

export function activate(context: vscode.ExtensionContext): void {
  const runApply = async () => {
    try {
      await applyUserTint(context);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(`User Tint: ${msg}`);
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('userTint.apply', runApply),
    vscode.commands.registerCommand('userTint.reset', async () => {
      try {
        await resetUserTint(context);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`User Tint: ${msg}`);
      }
    }),
    vscode.commands.registerCommand(
      'userTint.setColorForWorkspace',
      async () => {
        try {
          await setColorForWorkspace();
          const auto = vscode.workspace
            .getConfiguration(CFG)
            .get<boolean>('autoApply', true);
          if (auto) {
            await applyUserTint(context);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          vscode.window.showErrorMessage(`User Tint: ${msg}`);
        }
      },
    ),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      const auto = vscode.workspace
        .getConfiguration(CFG)
        .get<boolean>('autoApply', true);
      if (auto) {
        void runApply();
      }
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration(CFG)) {
        return;
      }
      const auto = vscode.workspace
        .getConfiguration(CFG)
        .get<boolean>('autoApply', true);
      if (auto) {
        void runApply();
      }
    }),
  );

  const auto = vscode.workspace
    .getConfiguration(CFG)
    .get<boolean>('autoApply', true);
  if (auto) {
    void runApply();
  }
}

export function deactivate(): void {}
