import * as vscode from 'vscode';

const swatchCache = new Map<string, vscode.Uri>();

function borderColorForFill(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) {
    return '#ffffff55';
  }
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#00000044' : '#ffffff55';
}

export function colorSwatchIcon(hex: string): vscode.Uri {
  const normalized = hex.toLowerCase();
  const cached = swatchCache.get(normalized);
  if (cached) {
    return cached;
  }

  const stroke = borderColorForFill(normalized);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="${normalized}" stroke="${stroke}" stroke-width="1"/></svg>`;
  const uri = vscode.Uri.parse(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
  );
  swatchCache.set(normalized, uri);
  return uri;
}

export function emptySwatchIcon(): vscode.Uri {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="#888" stroke-width="1" stroke-dasharray="3 2"/></svg>';
  return vscode.Uri.parse(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
  );
}
