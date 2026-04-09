# User Tint

Tint the **title bar** (and optionally the **activity bar**) so you can tell workspaces apart. **Matching rules live in your user settings**, similar in spirit to [Peacock](https://marketplace.visualstudio.com/items?itemName=johnpapa.vscode-peacock), but your color *logic* does not need to live in the repo.

Works in **VS Code** and **Cursor**.

## Important limitation (VS Code / Cursor)

The editor only applies `workbench.colorCustomizations` through normal configuration. This extension **writes the resolved colors to the workspace layer** (for example `.vscode/settings.json` when you open a folder, or your `*.code-workspace` file when you use one). There is no supported API for per-window colors that never persist anywhere.

- **Your rules** (`userTint.rules`, hash fallback, etc.) stay in **user** settings and are not tied to git.
- **The applied result** still lands in **workspace** storage so each window can look different. To avoid touching the repo, open the project via a **user-local** `.code-workspace` file (see below).

## Why pick this (lightweight option)?

User Tint is intentionally **small**: path/name **rules** and optional **hash fallback**, three commands, optional activity bar and optional **team workspace overrides**. No Live Share hooks, no large preset UI, no extra product surface beyond “resolve a color → apply workbench keys.”

**How it differs from common alternatives**

| | **User Tint** | **[Peacock](https://marketplace.visualstudio.com/items?itemName=johnpapa.vscode-peacock)** | **[Kingfisher](https://marketplace.visualstudio.com/items?itemName=AppSoftwareLtd.kingfisher)** |
| --- | --- | --- | --- |
| **Where your *logic* lives** | User settings: ordered `userTint.rules`, toggles, hash options | Workspace-centric coloring; often ends up in shared workspace settings | Preferences in extension / user storage, avoids workspace files |
| **How you choose colors** | Declarative matchers (`basename`, `pathPrefix`, etc.) + optional stable hash | Rich Peacock workflow, favorites, many integrations | Focused on not touching repo settings |
| **Several windows at once** | Each window keeps its tint via **workspace** `colorCustomizations` (same platform mechanism as Peacock) | Same idea | Often **focus-based** so the model trades off vs simultaneous per-window chrome |

Pick **User Tint** if you want **portable, readable rules in user JSON** (and Settings Sync), optional **zero-config differentiation** via hash, and a **deliberately minimal** extension. Pick **Peacock** if you want the full, polished ecosystem. Pick **Kingfisher** if **never writing workspace settings** matters more than how multi-window tinting behaves.

## Install

### From a VSIX

```bash
npm install
npm run compile
npx @vscode/vsce package --no-dependencies
```

Then in VS Code or Cursor: **Extensions** → **…** → **Install from VSIX…** and pick `user-tint-*.vsix`.

Or CLI:

```bash
cursor --install-extension ./user-tint-1.0.0.vsix
# or
code --install-extension ./user-tint-1.0.0.vsix
```

### From the Marketplace

After you publish (see [Publishing](#publishing)), install **User Tint** from the Extensions view like any other extension.

## Quick start

1. Open a **folder** or **multi-root workspace** (`.code-workspace`).
2. Open **Settings**, search for **User Tint**.
3. Either:
   - Turn on **User Tint › Hash Fallback** for an automatic stable color per workspace, or
   - Add **User Tint › Rules** (first match wins), or
   - Run the command **User Tint: Set color for this workspace…** (adds a rule and applies).

Foreground on the title bar is chosen for contrast when you only set a background.

### Example `settings.json` (User)

```json
{
  "userTint.autoApply": true,
  "userTint.hashFallback": true,
  "userTint.applyActivityBar": false,
  "userTint.rules": [
    {
      "match": "basename",
      "pattern": "my-api",
      "colors": {
        "titleBarActiveBackground": "#1e4d6b"
      }
    },
    {
      "match": "pathPrefix",
      "pattern": "/Users/you/work/client",
      "colors": {
        "titleBarActiveBackground": "#4a2c6e"
      }
    }
  ]
}
```

### Rule `match` values

| `match`                  | Compares `pattern` to                                      |
| ------------------------ | ----------------------------------------------------------- |
| `basename`               | First workspace folder’s directory name                     |
| `pathPrefix`             | Normalized path of that folder (prefix match)               |
| `pathContains`           | Substring of that folder path                               |
| `workspaceFilePath`      | Full normalized path of the `.code-workspace` file          |
| `workspaceFileBasename`  | Filename of the workspace file (e.g. `foo.code-workspace`)    |

Identity order: if a workspace **file** is open, that path is used for hashing and for `workspaceFile*` rules; folder rules still use the **first** root folder.

## Keeping color *writes* out of the repo

If you open `~/code/my-app` as a folder, workspace settings usually go to `my-app/.vscode/settings.json` (git may see it).

**Pattern that avoids repo changes:** create `~/Library/Application Support/Cursor/User/workspaces/my-app.code-workspace` (or any path **outside** the clone) with:

```json
{
  "folders": [{ "path": "/absolute/path/to/my-app" }],
  "settings": {}
}
```

Open that file in the editor. User Tint will persist `workbench.colorCustomizations` **in that workspace file**, not inside `my-app`.

## Optional team overrides (in the repo)

1. Set **User Tint › Allow Workspace Override** to `true` (user setting).
2. Commit **Workspace** settings with `userTint.workspaceColors` (same shape as rule `colors` keys: `titleBarActiveBackground`, etc.).

Overrides merge on top of your user rules for that workspace.

## Commands

| Command                                  | Action                                              |
| ---------------------------------------- | --------------------------------------------------- |
| **User Tint: Apply theme**               | Re-resolve rules and write workspace colors         |
| **User Tint: Set color for this workspace…** | Pick match type + hex; appends a user rule      |
| **User Tint: Reset workspace tint**      | Remove this extension’s title/activity bar keys and restore prior values when possible |

## Development

```bash
npm install
npm run compile   # or npm run watch
npm test          # Vitest, resolution logic only
```

**Run the extension:** open this repo in VS Code/Cursor → **Run and Debug** → **Run Extension** (F5). A new window opens with User Tint loaded.

## Publishing

This ships to the **Visual Studio Marketplace** (VS Code, Cursor, and other compatible editors use the same gallery). Official reference: [Publishing extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

### 1. One-time: marketplace publisher

1. Sign in with a **Microsoft account** at [Visual Studio Marketplace](https://marketplace.visualstudio.com/).
2. Open [Manage publishers & extensions](https://marketplace.visualstudio.com/manage).
3. Create a **publisher** (id is permanent; display name can differ). You will use the **publisher id** in `package.json` (e.g. `paulphan`).

### 2. One-time: Personal Access Token (PAT) for `vsce`

`vsce publish` uses a PAT, not your Microsoft password.

1. Go to [Azure DevOps](https://dev.azure.com) and sign in with the **same** Microsoft account.
2. **User settings** (profile icon) → **Personal access tokens** → **New token**.
3. Set a name, expiry, and under **Scopes** choose **Custom defined**, then enable **Marketplace** → **Manage** (wording can vary slightly; you need publish/manage rights for the marketplace).
4. Create the token and **copy it** (it is shown once).

### 3. One-time: log in with `vsce`

From this repo:

```bash
cd /path/to/project-theme-extension
npx @vscode/vsce login <your-publisher-id>
```

Paste the PAT when prompted. This stores a credential for future publishes (location depends on OS).

### 4. Before every release

1. In **`package.json`**, set `"publisher"` to your marketplace publisher id (if it is not already).
2. Bump **`"version"`** (semver: `1.0.1`, `1.1.0`, etc.). The marketplace rejects re-publishing the same version.
3. Optional: add **`repository`** and **`bugs`** in `package.json` so the extension page links to GitHub.
4. Run tests and compile:

```bash
npm test
npm run compile
```

### 5. Publish

```bash
npx @vscode/vsce publish --no-dependencies
```

That runs `vscode:prepublish` (compile), uploads the extension, and updates the listing. After a few minutes, search **User Tint** in the Extensions view (your `displayName`).

**Dry run (package only, no upload):**

```bash
npx @vscode/vsce package --no-dependencies
```

Produces `user-tint-<version>.vsix` for manual installs or [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).

### 6. Optional: Open VSX (VSCodium, some corporate mirrors)

[Cursors / Open VSX](https://open-vsx.org/) is a separate registry. See [Publishing extensions](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions) (`ovsx publish`, often with an Open VSX access token). Same codebase; second upload step.

### Common issues

- **403 / unauthorized:** PAT missing **Marketplace → Manage**, expired, or `vsce login` used a different publisher id than in `package.json`.
- **Duplicate version:** bump `version` in `package.json`.
- **Missing license:** this repo includes `LICENSE` (MIT); `vsce` packages it automatically.

## Privacy / data

Rules and preferences are normal VS Code **user** and **workspace** settings plus extension **workspace state** (snapshot of previous title/activity colors for reset). The extension does not send data anywhere.

## Upgrading from an older local build

If you previously installed a VSIX named `project-chrome`, uninstall it and install **User Tint**. Settings moved from `projectChrome.*` to `userTint.*`; copy any rules over manually.
