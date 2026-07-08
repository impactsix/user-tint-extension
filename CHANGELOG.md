# Changelog

All notable changes to this project are documented here.

The format is inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
