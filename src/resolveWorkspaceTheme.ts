export type RuleMatchKind =
  | 'basename'
  | 'pathPrefix'
  | 'pathContains'
  | 'workspaceFilePath'
  | 'workspaceFileBasename';

export interface RuleColors {
  titleBarActiveBackground?: string;
  titleBarActiveForeground?: string;
  activityBarBackground?: string;
  activityBarForeground?: string;
}

export interface TintRule {
  match: RuleMatchKind;
  pattern: string;
  colors: RuleColors;
}

export interface UserTintConfig {
  rules: TintRule[];
  hashFallback: boolean;
  hashSaturation: number;
  hashLightness: number;
  applyActivityBar: boolean;
  allowWorkspaceOverride: boolean;
}

export interface WorkspaceColorsConfig {
  titleBarActiveBackground?: string;
  titleBarActiveForeground?: string;
  activityBarBackground?: string;
  activityBarForeground?: string;
}

export interface WorkspaceIdentity {
  folderPath: string | undefined;
  folderBasename: string | undefined;
  workspaceFilePath: string | undefined;
  workspaceFileBasename: string | undefined;
}

export interface ResolvedWorkbenchColors {
  'titleBar.activeBackground'?: string;
  'titleBar.activeForeground'?: string;
  'activityBar.background'?: string;
  'activityBar.foreground'?: string;
}

export const MANAGED_WORKBENCH_KEYS = [
  'titleBar.activeBackground',
  'titleBar.activeForeground',
  'activityBar.background',
  'activityBar.foreground',
] as const;

export type ManagedWorkbenchKey = (typeof MANAGED_WORKBENCH_KEYS)[number];

export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '');
}

export function identityKey(identity: WorkspaceIdentity): string {
  if (identity.workspaceFilePath) {
    return normalizePath(identity.workspaceFilePath);
  }
  if (identity.folderPath) {
    return normalizePath(identity.folderPath);
  }
  return '';
}

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(31, h) + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function hslToHex(h: number, s: number, l: number): string {
  let hue = h % 360;
  if (hue < 0) {
    hue += 360;
  }
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const light = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hue < 60) {
    r1 = c;
    g1 = x;
  } else if (hue < 120) {
    r1 = x;
    g1 = c;
  } else if (hue < 180) {
    g1 = c;
    b1 = x;
  } else if (hue < 240) {
    g1 = x;
    b1 = c;
  } else if (hue < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }
  const toByte = (v: number) =>
    Math.round(Math.min(255, Math.max(0, (v + m) * 255)));
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(toByte(r1))}${hex(toByte(g1))}${hex(toByte(b1))}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) {
    return null;
  }
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function contrastingForeground(backgroundHex: string): string {
  const rgb = hexToRgb(backgroundHex);
  if (!rgb) {
    return '#f3f3f3';
  }
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.55 ? '#1e1e1e' : '#f3f3f3';
}

function ruleMatches(
  rule: TintRule,
  identity: WorkspaceIdentity,
): boolean {
  const { match, pattern } = rule;
  const fp = identity.folderPath ? normalizePath(identity.folderPath) : '';
  const wf = identity.workspaceFilePath
    ? normalizePath(identity.workspaceFilePath)
    : '';
  const base = identity.folderBasename ?? '';
  const wfBase = identity.workspaceFileBasename ?? '';
  const normPattern =
    match === 'pathPrefix' || match === 'workspaceFilePath'
      ? normalizePath(pattern)
      : pattern;

  switch (match) {
    case 'basename':
      return base === pattern;
    case 'pathPrefix':
      return fp.length > 0 && fp.startsWith(normPattern);
    case 'pathContains':
      return fp.length > 0 && fp.includes(pattern);
    case 'workspaceFilePath':
      return wf.length > 0 && wf === normPattern;
    case 'workspaceFileBasename':
      return wfBase.length > 0 && wfBase === pattern;
    default:
      return false;
  }
}

export function pickMatchingRule(
  rules: TintRule[],
  identity: WorkspaceIdentity,
): TintRule | undefined {
  for (const rule of rules) {
    if (ruleMatches(rule, identity)) {
      return rule;
    }
  }
  return undefined;
}

function mapRuleColorsToWorkbench(
  colors: RuleColors,
  applyActivityBar: boolean,
): ResolvedWorkbenchColors {
  const out: ResolvedWorkbenchColors = {};
  if (colors.titleBarActiveBackground) {
    out['titleBar.activeBackground'] = colors.titleBarActiveBackground;
    out['titleBar.activeForeground'] =
      colors.titleBarActiveForeground ??
      contrastingForeground(colors.titleBarActiveBackground);
  } else if (colors.titleBarActiveForeground) {
    out['titleBar.activeForeground'] = colors.titleBarActiveForeground;
  }
  if (applyActivityBar) {
    if (colors.activityBarBackground) {
      out['activityBar.background'] = colors.activityBarBackground;
      out['activityBar.foreground'] =
        colors.activityBarForeground ??
        contrastingForeground(colors.activityBarBackground);
    } else if (colors.activityBarForeground) {
      out['activityBar.foreground'] = colors.activityBarForeground;
    }
  }
  return out;
}

export function hashFallbackColors(
  key: string,
  saturation: number,
  lightness: number,
  applyActivityBar: boolean,
): ResolvedWorkbenchColors {
  if (!key) {
    return {};
  }
  const hue = hashString(key) % 360;
  const bg = hslToHex(hue, saturation, lightness);
  const fg = contrastingForeground(bg);
  const out: ResolvedWorkbenchColors = {
    'titleBar.activeBackground': bg,
    'titleBar.activeForeground': fg,
  };
  if (applyActivityBar) {
    out['activityBar.background'] = bg;
    out['activityBar.foreground'] = fg;
  }
  return out;
}

function mapWorkspaceOverrideToWorkbench(
  w: WorkspaceColorsConfig,
  applyActivityBar: boolean,
): ResolvedWorkbenchColors {
  const out: ResolvedWorkbenchColors = {};
  if (w.titleBarActiveBackground) {
    out['titleBar.activeBackground'] = w.titleBarActiveBackground;
    out['titleBar.activeForeground'] =
      w.titleBarActiveForeground ??
      contrastingForeground(w.titleBarActiveBackground);
  } else if (w.titleBarActiveForeground) {
    out['titleBar.activeForeground'] = w.titleBarActiveForeground;
  }
  if (applyActivityBar) {
    if (w.activityBarBackground) {
      out['activityBar.background'] = w.activityBarBackground;
      out['activityBar.foreground'] =
        w.activityBarForeground ??
        contrastingForeground(w.activityBarBackground);
    } else if (w.activityBarForeground) {
      out['activityBar.foreground'] = w.activityBarForeground;
    }
  }
  return out;
}

export function resolveWorkspaceTheme(
  identity: WorkspaceIdentity,
  user: UserTintConfig,
  workspaceOverride: WorkspaceColorsConfig | undefined,
): ResolvedWorkbenchColors {
  const rule = pickMatchingRule(user.rules, identity);
  let resolved: ResolvedWorkbenchColors = rule
    ? mapRuleColorsToWorkbench(rule.colors, user.applyActivityBar)
    : {};

  if (
    Object.keys(resolved).length === 0 &&
    user.hashFallback &&
    identityKey(identity)
  ) {
    resolved = hashFallbackColors(
      identityKey(identity),
      user.hashSaturation,
      user.hashLightness,
      user.applyActivityBar,
    );
  }

  if (user.allowWorkspaceOverride && workspaceOverride) {
    const override = mapWorkspaceOverrideToWorkbench(
      workspaceOverride,
      user.applyActivityBar,
    );
    resolved = { ...resolved, ...override };
  }

  return resolved;
}
