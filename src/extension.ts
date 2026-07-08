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
import { pickAndConfirmTitleBarColor } from './pickTitleBarColor';

const SNAPSHOT_KEY = 'userTint.managedColorSnapshot';
const WRITE_BLOCK_NOTICE_KEY = 'userTint.writeBlockedNoticeShown';
const TITLE_BAR_STYLE_NOTICE_KEY = 'userTint.titleBarStyleNoticeShown';
const CFG = 'userTint';

export type ApplyNotify = 'always' | 'once' | 'never';

export type ApplyResult =
  | { status: 'applied'; background: string }
  | { status: 'no-folder' }
  | { status: 'write-blocked'; mode: 'workspaceFileOnly' | 'never' }
  | { status: 'no-rule' };

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
    workspaceWriteMode: cfg.get<'workspace' | 'workspaceFileOnly' | 'never'>(
      'workspaceWriteMode',
      'workspace',
    ),
  };
}

function readWorkspaceColorsOverride(): WorkspaceColorsConfig {
  const cfg = vscode.workspace.getConfiguration(CFG);
  const raw = cfg.get<WorkspaceColorsConfig>('workspaceColors', {});
  return raw && typeof raw === 'object' ? raw : {};
}

async function notifyApplyResult(
  context: vscode.ExtensionContext,
  result: ApplyResult,
  notify: ApplyNotify,
): Promise<void> {
  if (notify === 'never') {
    return;
  }

  if (result.status === 'applied') {
    if (notify === 'always') {
      vscode.window.showInformationMessage(
        `User Tint: title bar set to ${result.background}`,
      );
    }
    return;
  }

  if (result.status === 'no-rule') {
    if (notify === 'always') {
      vscode.window.showWarningMessage(
        'User Tint: no matching rule for this workspace. Run "Set color for this workspace…" or enable hash fallback.',
      );
    }
    return;
  }

  if (result.status === 'no-folder') {
    return;
  }

  if (result.status === 'write-blocked') {
    if (
      notify === 'once' &&
      context.workspaceState.get<boolean>(WRITE_BLOCK_NOTICE_KEY, false)
    ) {
      return;
    }

    if (notify === 'once') {
      await context.workspaceState.update(WRITE_BLOCK_NOTICE_KEY, true);
    }

    const modeLabel =
      result.mode === 'workspaceFileOnly' ? 'Workspace File Only' : 'Never';
    const choice = await vscode.window.showWarningMessage(
      `User Tint: your rules are saved, but the title bar was not updated. Workspace Write Mode is "${modeLabel}" and this window is a folder (not a .code-workspace file).`,
      'Use workspace mode',
      'Dismiss',
    );

    if (choice === 'Use workspace mode') {
      const cfg = vscode.workspace.getConfiguration(CFG);
      await cfg.update(
        'workspaceWriteMode',
        'workspace',
        vscode.ConfigurationTarget.Global,
      );
      await context.workspaceState.update(WRITE_BLOCK_NOTICE_KEY, false);
      await applyUserTint(context, { notify: 'always' });
    }
  }
}

type Snapshot = Partial<Record<ManagedWorkbenchKey, string | undefined>>;

async function warnIfTitleBarStyleBlocksTint(
  context: vscode.ExtensionContext,
): Promise<void> {
  const windowCfg = vscode.workspace.getConfiguration('window');
  const inspected = windowCfg.inspect<string>('titleBarStyle');
  const effective =
    inspected?.workspaceValue ??
    inspected?.globalValue ??
    inspected?.defaultValue ??
    'custom';

  if (effective === 'custom') {
    return;
  }

  if (context.globalState.get<boolean>(TITLE_BAR_STYLE_NOTICE_KEY, false)) {
    return;
  }

  await context.globalState.update(TITLE_BAR_STYLE_NOTICE_KEY, true);

  const choice = await vscode.window.showWarningMessage(
    'User Tint: title bar colors only show when "window.titleBarStyle" is "custom" (macOS/Cursor often default to native). Enable custom title bar now?',
    'Enable',
    'Not now',
  );

  if (choice === 'Enable') {
    await windowCfg.update(
      'titleBarStyle',
      'custom',
      vscode.ConfigurationTarget.Global,
    );
    await context.globalState.update(TITLE_BAR_STYLE_NOTICE_KEY, false);
  }
}

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
  options?: { notify?: ApplyNotify },
): Promise<ApplyResult> {
  const notify = options?.notify ?? 'once';
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return { status: 'no-folder' };
  }

  const identity = buildIdentity();
  const user = readUserTintConfig();

  if (
    user.workspaceWriteMode !== 'workspace' &&
    !vscode.workspace.workspaceFile
  ) {
    const result: ApplyResult = {
      status: 'write-blocked',
      mode:
        user.workspaceWriteMode === 'workspaceFileOnly'
          ? 'workspaceFileOnly'
          : 'never',
    };
    await notifyApplyResult(context, result, notify);
    return result;
  }

  const workspaceOverride = readWorkspaceColorsOverride();
  const resolved = resolveWorkspaceTheme(identity, user, workspaceOverride);

  if (Object.keys(resolved).length === 0) {
    const result: ApplyResult = { status: 'no-rule' };
    await notifyApplyResult(context, result, notify);
    return result;
  }

  await warnIfTitleBarStyleBlocksTint(context);

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

  const background =
    typeof resolved['titleBar.activeBackground'] === 'string'
      ? resolved['titleBar.activeBackground']
      : '#000000';
  const result: ApplyResult = { status: 'applied', background };
  await notifyApplyResult(context, result, notify);
  return result;
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

  const bg = await pickAndConfirmTitleBarColor();
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
    `User Tint: saved rule (${matchKind.match}: ${pattern}, ${bg}).`,
  );
}

export function activate(context: vscode.ExtensionContext): void {
  const runApply = async (notify: ApplyNotify = 'always') => {
    try {
      await applyUserTint(context, { notify });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(`User Tint: ${msg}`);
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('userTint.apply', () => runApply('always')),
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
            await applyUserTint(context, { notify: 'always' });
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
        void runApply('once');
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
        void runApply('once');
      }
    }),
  );

  const auto = vscode.workspace
    .getConfiguration(CFG)
    .get<boolean>('autoApply', true);
  if (auto) {
    void runApply('once');
  }
}

export function deactivate(): void {}
