# Changelog

All notable changes to this project are documented here.

The format is inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.13] - 2026-07-08

### Added

- Flat UI presets with color swatches, live title bar preview, and confirm-before-save flow.
- `pnpm package:vsix` → `dist/user-tint-<version>.vsix`.

### Fixed

- Set `titleBar.inactiveBackground` / `titleBar.inactiveForeground` so tint stays visible when the window is unfocused.
- Apply feedback when workspace write mode blocks folder workspaces; one-click **Use workspace mode**.

### Changed

- README: recommended user settings (`window.titleBarStyle`, `userTint.autoApply`, `workspaceWriteMode`), command guide, troubleshooting.

## [1.0.12] - 2026-07-08

### Added

- **Live title bar preview** while arrowing through colors or typing hex (not only on the highlighted row or confirm step). Custom hex input previews as you type too.

## [1.0.11] - 2026-07-08

### Added

- Color swatches (filled squares) beside Flat UI presets and typed hex colors in the picker.
- **Preview title bar color** confirm step before saving a rule.
- Clear apply feedback when blocked, including one-click **Use workspace mode**.

### Fixed

- **Apply theme** always explains why the title bar did not change (e.g. `workspaceFileOnly` with a folder workspace).

## [1.0.10] - 2026-07-08

### Changed

- Color picker: **Custom hex…** first; typing a valid hex uses it when no preset matches (including **Use #…** row).
- On apply, prompt once to set `window.titleBarStyle` to `custom` when title bar colors would be hidden (common on macOS/Cursor).

### Added

- README troubleshooting for title bar not changing and activity bar setting.

## [1.0.9] - 2026-07-08

### Added

- **Flat UI preset palette** in **User Tint: Set color for this workspace…** (18 colors plus **Custom hex…**).
- README: command guide, preset table, and `pnpm package:vsix` build instructions.

## [1.0.8] - 2026-07-08

### Fixed

- CI/release install check: verify `@types/vscode` via filesystem path (types packages are not `require()`-able).

## [1.0.7] - 2026-07-08

### Fixed

- Regenerate `package-lock.json` against the public npm registry (lockfile previously pointed at an internal corporate registry, breaking CI and release publish).

## [1.0.6] - 2026-07-08

### Fixed

- CI and release workflows: use Node 24 and `npm install` instead of `npm ci` (npm was failing on GitHub Actions runners).

## [1.0.5] - 2026-07-08

### Fixed

- Release workflow: disable npm cache and require successful `require()` checks after `npm ci` (npm can exit 0 while install is broken on CI).

## [1.0.4] - 2026-07-08

### Fixed

- Release workflow: retry `npm ci` and verify dependencies before compile/publish (fixes failed automated deploy for v1.0.3).
- Release workflow: fail with a clear message when `VSCE_PAT` is missing.

### Changed

- README: link CHANGELOG and expand workspace write mode documentation.
- CI and prepublish: enforce CHANGELOG entry for the current package version.

_Note: v1.0.4 automated publish did not complete; use v1.0.5._

## [1.0.3] - 2026-05-08

### Added

- `userTint.workspaceWriteMode` (`workspace` | `workspaceFileOnly` | `never`) so you can avoid writing `workbench.colorCustomizations` into a repo’s `.vscode/settings.json` when using folder workspaces (use a user-local `.code-workspace` with `workspaceFileOnly`, or disable workspace writes with `never`).

## [1.0.2] - 2026-04-09

### Added

- README section explaining motivation (shared `.vscode` / team repos) and how User Tint differs from workspace-only tint setups.
- GitHub Actions CI (`compile` + tests on push/PR to `main`).
- Release workflow: publish VSIX on published GitHub Release; fix `npm version` when tag already matches `package.json`.

## [1.0.1] - 2026-04-09

### Changed

- Marketplace icon and metadata polish (`publisher`, repository URLs).

## [1.0.0] - 2026-04-09

### Added

- Initial public release: user-owned rules, optional hash fallback, quick setup command, optional workspace overrides, reset.
