import * as vscode from 'vscode';
import { colorSwatchIcon, emptySwatchIcon } from './colorSwatch';
import { contrastingForeground } from './resolveWorkspaceTheme';
import { FLAT_UI_PRESETS } from './presetColors';
import {
  captureTitleBarSnapshot,
  previewTitleBar,
  restoreTitleBarSnapshot,
} from './titleBarPreview';

function normalizeHex(input: string): string | undefined {
  const t = input.trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(t);
  if (!m) {
    return undefined;
  }
  return `#${m[1].toLowerCase()}`;
}

export type ColorPick = vscode.QuickPickItem & { hex?: string };

function withSwatch(item: ColorPick, hex?: string): ColorPick {
  if (hex) {
    return { ...item, iconPath: colorSwatchIcon(hex) };
  }
  return { ...item, iconPath: emptySwatchIcon() };
}

function buildPresetItems(): ColorPick[] {
  return FLAT_UI_PRESETS.map((preset) =>
    withSwatch(
      {
        label: preset.label,
        description: preset.hex,
        hex: preset.hex,
      },
      preset.hex,
    ),
  );
}

function filterPresetItems(presets: ColorPick[], filter: string): ColorPick[] {
  const q = filter.trim().toLowerCase();
  if (!q) {
    return presets;
  }
  return presets.filter(
    (p) =>
      p.label!.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q),
  );
}

function hexFromActiveItem(
  quickPick: vscode.QuickPick<ColorPick>,
): string | undefined {
  const active = quickPick.activeItems[0];
  if (active?.hex) {
    return active.hex;
  }
  return normalizeHex(quickPick.value);
}

async function promptCustomHex(
  snapshot: Record<string, unknown>,
): Promise<string | undefined> {
  const input = vscode.window.createInputBox();
  input.title = 'Title bar color (hex)';
  input.prompt = 'e.g. #1e3a5f — title bar previews as you type';
  input.value = '#2d6cdf';

  return new Promise((resolve) => {
    let settled = false;
    const finish = async (hex: string | undefined) => {
      if (settled) {
        return;
      }
      settled = true;
      input.hide();
      if (!hex) {
        await restoreTitleBarSnapshot(snapshot);
      }
      resolve(hex);
    };

    input.onDidChangeValue((value) => {
      const hex = normalizeHex(value);
      if (hex) {
        void previewTitleBar(hex, snapshot);
      } else {
        void restoreTitleBarSnapshot(snapshot);
      }
    });

    input.onDidAccept(() => {
      const hex = normalizeHex(input.value);
      if (!hex) {
        input.validationMessage = 'Use a 6-digit hex color, with or without #';
        return;
      }
      void finish(hex);
    });

    input.onDidHide(() => {
      input.dispose();
      if (!settled) {
        void finish(undefined);
      }
    });

    input.show();
  });
}

export async function pickTitleBarColor(
  snapshot: Record<string, unknown>,
): Promise<string | undefined> {
  const presets = buildPresetItems();

  const quickPick = vscode.window.createQuickPick<ColorPick>();
  quickPick.title = 'Title bar color';
  quickPick.placeholder =
    'Arrow through colors to preview on the title bar, or type hex';
  quickPick.matchOnDescription = true;

  const refreshItems = (filter: string) => {
    const typedHex = normalizeHex(filter);
    const customItem = withSwatch(
      {
        label: 'Custom hex…',
        description: typedHex
          ? `${typedHex} — press Enter to use`
          : 'Type a 6-digit hex in the box above',
        alwaysShow: true,
      },
      typedHex,
    );

    const items: ColorPick[] = [customItem];

    if (typedHex && !presets.some((p) => p.hex === typedHex)) {
      const fg = contrastingForeground(typedHex);
      items.push(
        withSwatch(
          {
            label: `Use ${typedHex}`,
            description: `Text on bar: ${fg}`,
            hex: typedHex,
          },
          typedHex,
        ),
      );
    }

    items.push({ label: 'Flat UI', kind: vscode.QuickPickItemKind.Separator });
    items.push(...filterPresetItems(presets, filter));
    quickPick.items = items;
  };

  refreshItems('');

  quickPick.onDidChangeValue((value) => {
    refreshItems(value);
    const hex = normalizeHex(value);
    if (hex) {
      void previewTitleBar(hex, snapshot);
    }
  });

  quickPick.onDidChangeActive(() => {
    void previewTitleBar(hexFromActiveItem(quickPick), snapshot);
  });

  return new Promise((resolve) => {
    let settled = false;
    const finish = (hex: string | undefined, restore: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      quickPick.hide();
      if (restore) {
        void restoreTitleBarSnapshot(snapshot).then(() => resolve(hex));
        return;
      }
      resolve(hex);
    };

    quickPick.onDidAccept(async () => {
      const selected = quickPick.selectedItems[0];
      if (selected?.hex) {
        finish(selected.hex, false);
        return;
      }

      const typedHex = normalizeHex(quickPick.value);
      if (typedHex) {
        finish(typedHex, false);
        return;
      }

      if (selected?.label === 'Custom hex…') {
        settled = true;
        quickPick.hide();
        const hex = await promptCustomHex(snapshot);
        resolve(hex);
        return;
      }

      finish(undefined, true);
    });

    quickPick.onDidHide(() => {
      quickPick.dispose();
      if (!settled) {
        finish(undefined, true);
      }
    });

    quickPick.show();
  });
}

export async function confirmTitleBarColor(
  hex: string,
  snapshot: Record<string, unknown>,
): Promise<boolean> {
  await previewTitleBar(hex, snapshot);

  const fg = contrastingForeground(hex);
  const choice = await vscode.window.showQuickPick(
    [
      withSwatch(
        {
          label: `Apply ${hex}`,
          description: `Title bar background (foreground ${fg})`,
        },
        hex,
      ),
      {
        label: 'Back',
        description: 'Pick a different color',
        iconPath: emptySwatchIcon(),
      },
    ],
    { title: 'Preview title bar color', matchOnDescription: true },
  );

  if (!choice) {
    await restoreTitleBarSnapshot(snapshot);
    return false;
  }

  if (choice.label.startsWith('Apply')) {
    return true;
  }

  await restoreTitleBarSnapshot(snapshot);
  return false;
}

export async function pickAndConfirmTitleBarColor(): Promise<string | undefined> {
  const snapshot = captureTitleBarSnapshot();

  while (true) {
    const hex = await pickTitleBarColor(snapshot);
    if (!hex) {
      await restoreTitleBarSnapshot(snapshot);
      return undefined;
    }
    if (await confirmTitleBarColor(hex, snapshot)) {
      return hex;
    }
  }
}
