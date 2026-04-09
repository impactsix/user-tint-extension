import { describe, expect, it } from 'vitest';
import {
  hashFallbackColors,
  identityKey,
  normalizePath,
  pickMatchingRule,
  resolveWorkspaceTheme,
  type TintRule,
  type WorkspaceIdentity,
} from './resolveWorkspaceTheme';

describe('normalizePath', () => {
  it('normalizes slashes and trailing slash', () => {
    expect(normalizePath('/foo/bar/')).toBe('/foo/bar');
    expect(normalizePath('C:\\foo\\bar')).toBe('C:/foo/bar');
  });
});

describe('identityKey', () => {
  it('prefers workspace file over folder', () => {
    expect(
      identityKey({
        folderPath: '/proj',
        folderBasename: 'proj',
        workspaceFilePath: '/home/u/ws.code-workspace',
        workspaceFileBasename: 'ws.code-workspace',
      }),
    ).toBe('/home/u/ws.code-workspace');
  });

  it('uses folder when no workspace file', () => {
    expect(
      identityKey({
        folderPath: '/Users/me/app',
        folderBasename: 'app',
        workspaceFilePath: undefined,
        workspaceFileBasename: undefined,
      }),
    ).toBe('/Users/me/app');
  });
});

describe('pickMatchingRule', () => {
  const id: WorkspaceIdentity = {
    folderPath: '/Users/me/my-app/src',
    folderBasename: 'src',
    workspaceFilePath: undefined,
    workspaceFileBasename: undefined,
  };

  it('matches basename', () => {
    const rules: TintRule[] = [
      {
        match: 'basename',
        pattern: 'src',
        colors: { titleBarActiveBackground: '#112233' },
      },
    ];
    expect(pickMatchingRule(rules, id)?.colors.titleBarActiveBackground).toBe(
      '#112233',
    );
  });

  it('matches pathPrefix', () => {
    const rules: TintRule[] = [
      {
        match: 'pathPrefix',
        pattern: '/Users/me/my-app',
        colors: { titleBarActiveBackground: '#abcdef' },
      },
    ];
    expect(pickMatchingRule(rules, id)?.colors.titleBarActiveBackground).toBe(
      '#abcdef',
    );
  });

  it('first match wins', () => {
    const rules: TintRule[] = [
      {
        match: 'basename',
        pattern: 'src',
        colors: { titleBarActiveBackground: '#111111' },
      },
      {
        match: 'pathPrefix',
        pattern: '/Users/me',
        colors: { titleBarActiveBackground: '#222222' },
      },
    ];
    expect(pickMatchingRule(rules, id)?.colors.titleBarActiveBackground).toBe(
      '#111111',
    );
  });
});

describe('hashFallbackColors', () => {
  it('is stable per key', () => {
    const a = hashFallbackColors('/foo', 42, 32, false);
    const b = hashFallbackColors('/foo', 42, 32, false);
    expect(a).toEqual(b);
  });

  it('differs for different keys', () => {
    const a = hashFallbackColors('/aaa', 42, 32, false);
    const b = hashFallbackColors('/bbb', 42, 32, false);
    expect(a['titleBar.activeBackground']).not.toBe(
      b['titleBar.activeBackground'],
    );
  });
});

describe('resolveWorkspaceTheme', () => {
  const identity: WorkspaceIdentity = {
    folderPath: '/work/client',
    folderBasename: 'client',
    workspaceFilePath: undefined,
    workspaceFileBasename: undefined,
  };

  const baseUser = {
    rules: [] as TintRule[],
    hashFallback: false,
    hashSaturation: 42,
    hashLightness: 32,
    applyActivityBar: false,
    allowWorkspaceOverride: false,
  };

  it('uses hash fallback when enabled and no rule', () => {
    const r = resolveWorkspaceTheme(identity, { ...baseUser, hashFallback: true }, undefined);
    expect(r['titleBar.activeBackground']).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('workspace override wins when allowed', () => {
    const r = resolveWorkspaceTheme(
      identity,
      {
        ...baseUser,
        rules: [
          {
            match: 'basename',
            pattern: 'client',
            colors: { titleBarActiveBackground: '#111111' },
          },
        ],
        allowWorkspaceOverride: true,
      },
      { titleBarActiveBackground: '#ff00aa' },
    );
    expect(r['titleBar.activeBackground']).toBe('#ff00aa');
  });
});
