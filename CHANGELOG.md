# Change Log

All notable changes to the "Neon Shimmer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.2.1]

### Added

- New theme: **Neon Shimmer // Acid Chemtech** — Arcane Zaun chemtech aesthetic with toxic emerald (`#00FF88`), acid lime (`#C3FF00`), and electric cyan (`#00E5FF`) on deep emerald-black (`#010C07`).
- New theme: **Neon Shimmer // Solar Amber** — Arcane Hextech radiant solar gold aesthetic with cyber gold (`#FFB800`), neon coral (`#FF5436`), and electric cyan (`#04D9C4`) on deep warm obsidian (`#0A0702`).
- Deterministic theme compiler (`scripts/build.js`) generating all 6 theme variants from unified palette definitions and shared workbench / TextMate templates.
- Modern VS Code layout support (VS Code 1.70 - 1.96+):
  - Secondary Side Bar (`auxiliaryBar.*`)
  - Top Activity Bar (`activityBarTop.*`)
  - GitHub Copilot Chat, Inline Chat, and Inline Edit (`chat.*`, `inlineChat.*`, `inlineEdit.*`, `editorGhostText.*`)
  - Multi-diff Editor & unchanged region styling (`multiDiffEditor.*`, `diffEditor.unchangedRegion*`)
  - Full `symbolIcon.*` suite (25+ tokens) for breadcrumbs, outline, and suggestion widgets.
  - Multi-depth bracket and indentation hierarchy (`editorIndentGuide.background1-6`, `editorIndentGuide.activeBackground1-6`, `editorBracketPairGuide.background1-6`).
  - Terminal shell integration decorations (`terminalCommandDecoration.*`).
- Automated WCAG 2.1 AA contrast and hex format verification during theme compilation.

### Fixed

- **Operator Contrast Matchup (Issue #8)**: Replaced Coral Orange (`#ff845e`) with Lavender Purple (`#8968ff`) for operators in base Neon Shimmer, resolving the color clash where logical/arithmetic operators blended directly into adjacent Hot Pink variables and parameters (e.g. `!targetIds && !test`).
- **Comment Readability (Issue #7)**: Brightened comment color to `#8c929eea` (contrast $\ge 5.5:1$ across all variants), eliminating the dim comment issue and significantly enhancing editor readability.
- **WCAG 2.1 AA Contrast**:
  - Raised editor comment alpha from 53% (`#7f848e87`, 2.22:1) to 91.8% (`#7f848eea`, >= 4.60:1), achieving strict WCAG 2.1 AA compliance across all 6 variants without lowering the audit threshold.
  - Raised Purple theme variables from `#8E4AF5` (4.37:1) to `#9D5EFF` (5.38:1) to meet AA body text standards.
  - Raised Pink theme operators from `#8E4AF5` (4.39:1) to `#A366FF` (5.83:1).
- **Malformed Hex Colors**: Fixed 10-digit invalid hex color generation for `chat.slashCommandBackground`.
- **ANSI Terminal Integrity**: Restored true semantic ANSI colors (Red, Green, Yellow, Blue) with neon saturation across all 6 themes, fixing corrupted test failure and CLI output signaling in Pink and Purple.
- **Variant Border Corruption**: Eliminated chalk-white borders in Pink theme caused by historical find-and-replace collisions with cyan keyword tokens.
- **Scope Collision**: Removed `entity.name.label.cs` mistakenly nested under Rule #231 Markdown headers.
- **Unstyled Error Tokens**: Styled `invalid.illegal`, `invalid.broken`, and `invalid.deprecated` with distinct neon error highlights.
- **Package Optimization**: Excluded heavy screenshot previews from `.vsix` bundle via `.vscodeignore` and updated README image sources to GitHub URLs, reducing package size from ~2MB to <200KB.

### Changed

- Base Neon strings updated to Soft Ice Cyan (`#d6f9ff`) for consistency with the pastel string palette across variants.
- Mapped dedicated `semanticTokenColors` for all 6 theme variants.
- Standardized theme naming across all JSON files to match `package.json` (`Neon Shimmer // <Variant>`).

## [1.2.0]

### Added

- New theme: **Neon Shimmer (Crimson Drive)** — Intense deep red UI and #E64471 primary mapping
- New theme: **Neon Shimmer (Bubblegum Punk)** — Vivid pink/magenta dominance with soft lavender strings
- Updated terminal ANSI colors, git decorations, notification icons, and merge conflicts to use the neon palette rather than VS Code defaults
- Added UI support for modern features: bracket pair colorization, inlay hints, sticky scroll, command center, and keybinding labels
- Added `editorStickyScroll.border`, `tab.lastPinnedBorder`, `sash.hoverBorder` UI color tokens
- Added automated GitHub release workflow on tag push

### Fixed

- Added missing `debugConsole` colors to fix invisible output text
- Replaced off-palette error reds with the theme's official red (`#ff1c5b`)
- Fixed invisible `editorInfo` squiggles and background highlights
- Fixed leading space in `meta.brace.square` scope that prevented proper matching
- Fixed mislabeled `"support php constants"` rule that actually targeted Rust scopes
- Renamed duplicate token names for clarity (java, classes, constants, support types)

### Changed

- Updated `devDependencies` from deprecated `vsce` to `@vscode/vsce`
- Improved `.vscodeignore` to exclude unnecessary files from packaging

## [1.0.2]

### Updates

- Fixed background selection color for terminal
- Updated screenshots
