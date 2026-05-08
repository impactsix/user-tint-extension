/**
 * Ensures CHANGELOG.md includes a section for the current package.json version.
 * Expected heading: ## [1.2.3] (optional suffix like " - 2026-05-08" is fine)
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const version = pkg.version;
if (!version || typeof version !== 'string') {
  console.error('package.json is missing a string "version".');
  process.exit(1);
}

let changelog;
try {
  changelog = readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8');
} catch {
  console.error('CHANGELOG.md is missing. Add one before releasing.');
  process.exit(1);
}

const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const heading = new RegExp(`^## \\[${escaped}\\]`, 'm');
if (!heading.test(changelog)) {
  console.error(
    `CHANGELOG.md must include a section heading "## [${version}]" for the current package version.`,
  );
  process.exit(1);
}

console.log(`CHANGELOG.md OK: found section for ${version}`);
