import * as vscode from 'vscode';
import { contrastingForeground } from './resolveWorkspaceTheme';

const CFG = 'userTint';

export function canPreviewTitleBar(): boolean {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return false;
  }

  const mode = vscode.workspace
    .getConfiguration(CFG)
    .get<'workspace' | 'workspaceFileOnly' | 'never'>('workspaceWriteMode', 'workspace');

  if (mode !== 'workspace' && !vscode.workspace.workspaceFile) {
    return false;
  }

  return true;
}

export function captureTitleBarSnapshot(): Record<string, unknown> {
  const workbench = vscode.workspace.getConfiguration('workbench');
  const current =
    (workbench.get('colorCustomizations') as Record<string, unknown>) ?? {};
  return { ...current };
}

export async function previewTitleBar(
  hex: string | undefined,
  snapshot: Record<string, unknown>,
): Promise<void> {
  if (!canPreviewTitleBar()) {
    return;
  }

  const workbench = vscode.workspace.getConfiguration('workbench');

  if (!hex) {
    await workbench.update(
      'colorCustomizations',
      snapshot,
      vscode.ConfigurationTarget.Workspace,
    );
    return;
  }

  await workbench.update(
    'colorCustomizations',
    {
      ...snapshot,
      'titleBar.activeBackground': hex,
      'titleBar.activeForeground': contrastingForeground(hex),
      'titleBar.inactiveBackground': hex,
      'titleBar.inactiveForeground': contrastingForeground(hex),
    },
    vscode.ConfigurationTarget.Workspace,
  );
}

export async function restoreTitleBarSnapshot(
  snapshot: Record<string, unknown>,
): Promise<void> {
  await previewTitleBar(undefined, snapshot);
}
