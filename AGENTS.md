# Neon Shimmer — Agent & Engineering Guidelines

This repository maintains the **Neon Shimmer** theme suite for VS Code. All agents and contributors must strictly adhere to the following architectural invariants:

## 1. Deterministic Architecture Over String Replacement
- **Never** generate or modify variant themes using global regex or text find-and-replace on JSON files.
- All 6 theme variants are compiled deterministically via `scripts/build.js`:
  ```bash
  npm run build   # Compiles all themes to themes/*.json
  npm test        # Runs build and automated WCAG 2.1 AA verification
  ```
- To modify or add themes, edit `scripts/build.js` semantic slots in `PALETTES` and shared templates.

## 2. WCAG 2.1 AA Syntax Contrast Invariants
- Verify syntax token contrast ($(L_1 + 0.05) / (L_2 + 0.05)$) against the editor background:
  - Body identifiers, variables, types, and keywords must achieve $\ge 4.5:1$ (WCAG AA).
  - Comments must maintain $\ge 4.5:1$ on dark backgrounds (use $\ge 90\%$ alpha, e.g. `#7f848eea`).
- Verification runs automatically during `npm test`. Never bypass or relax contrast thresholds.

## 3. ANSI Semantic Integrity
- `terminal.ansi*` colors must preserve standard semantic meanings:
  - **Red**: errors, failures, deletions.
  - **Green**: passes, additions, success.
  - **Yellow**: warnings.
  - **Blue**: directories, info.
- Neon tinting and high saturation are encouraged, but never map red to magenta or purple.

## 4. Modern Surface Coverage
- Always maintain explicit tokens for modern VS Code interfaces:
  - **Secondary Side Bar / Copilot Chat**: `auxiliaryBar.*`, `chat.*`, `inlineChat.*`, `inlineEdit.*`, `editorGhostText.*`
  - **Top Activity Bar**: `activityBarTop.*`
  - **Sticky Scroll**: `editorStickyScroll.*`, `sideBarStickyScroll.*`
  - **Symbol Icons**: `symbolIcon.*` suite (25+ tokens) for breadcrumbs and suggestions
  - **Multi-Diff Editor**: `multiDiffEditor.*`, `diffEditor.unchangedRegion*`
  - **Bracket & Indent Guides**: `editorIndentGuide.background1-6`, `editorBracketPairGuide.background1-6`

## 5. Clean Repository Paths & Zero PII
- **Never** embed absolute local file paths, machine-specific paths, usernames, or PII into repository source files, scripts, comments, or generated outputs.
- Always use relative paths from the workspace root (e.g. `themes/`, `scripts/`, `assets/`).
