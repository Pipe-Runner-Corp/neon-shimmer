/**
 * neon-shimmer Theme Compiler
 * Deterministic build system for Neon Shimmer VS Code theme variants.
 * Adheres to: AGENTS.md rules (deterministic compiler, WCAG 2.1 AA, semantic ANSI).
 */

const fs = require('fs');
const path = require('path');

// --- WCAG 2.1 Contrast Calculation Utilities ---
function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  let alpha = 1;
  if (hex.length === 8) {
    alpha = parseInt(hex.slice(6, 8), 16) / 255;
    hex = hex.slice(0, 6);
  }
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, alpha];
}

function blend(fgHex, bgHex) {
  const [r1, g1, b1, a1] = hexToRgb(fgHex);
  const [r2, g2, b2] = hexToRgb(bgHex);
  return [
    Math.round(r1 * a1 + r2 * (1 - a1)),
    Math.round(g1 * a1 + g2 * (1 - a1)),
    Math.round(b1 * a1 + b2 * (1 - a1))
  ];
}

function relLuminance([r, g, b]) {
  const sRGB = [r / 255, g / 255, b / 255];
  const linear = sRGB.map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function getContrast(fgHex, bgHex) {
  const rgb = blend(fgHex, bgHex);
  const bgRgb = hexToRgb(bgHex).slice(0, 3);
  const L1 = relLuminance(rgb);
  const L2 = relLuminance(bgRgb);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function withAlpha(hex, alpha) {
  return hex.slice(0, 7) + alpha;
}

// --- Semantic Neon ANSI Terminal Colors (Preserved across ALL variants) ---
function getSemanticAnsi(bg) {
  return {
    'terminal.ansiBlack': bg,
    'terminal.ansiRed': '#e64471',
    'terminal.ansiGreen': '#73c991',
    'terminal.ansiYellow': '#ffd11b',
    'terminal.ansiBlue': '#8968ff',
    'terminal.ansiMagenta': '#ee4cfc',
    'terminal.ansiCyan': '#04d9c4',
    'terminal.ansiWhite': '#e5e5e5',
    'terminal.ansiBrightBlack': '#666666',
    'terminal.ansiBrightRed': '#ff487b',
    'terminal.ansiBrightGreen': '#a6e422',
    'terminal.ansiBrightYellow': '#ffdf7e',
    'terminal.ansiBrightBlue': '#a78bff',
    'terminal.ansiBrightMagenta': '#f942ff',
    'terminal.ansiBrightCyan': '#45ffed',
    'terminal.ansiBrightWhite': '#ffffff'
  };
}

// --- Modern Layout Surface Generator ---
function getModernSurfaces(palette) {
  const bg = palette.bg;
  const sideBarBg = palette.sideBarBg;
  const sideBarFg = '#cccccc';
  const sideBarBorder = palette.sideBarBorder;
  const sideBarTitleFg = palette.sideBarTitleFg;
  const actFg = palette.activityBarFg;
  const actInactive = palette.activityBarInactiveFg;
  const actBadgeBg = palette.activityBarBadgeBg;
  const focusBorder = palette.focusBorder;
  const border = palette.border;
  const primaryVar = palette.slots.primaryVar;
  const keyword = palette.slots.keyword;
  const constant = palette.slots.constant;
  const str = palette.slots.string;
  const type = palette.slots.type;
  const fn = palette.slots.function;
  const op = palette.slots.operator;
  const brackets = palette.brackets;

  return {
    // auxiliaryBar (Secondary Side Bar / Copilot)
    'auxiliaryBar.background': sideBarBg,
    'auxiliaryBar.foreground': sideBarFg,
    'auxiliaryBar.border': sideBarBorder,
    'auxiliaryBarTitle.foreground': sideBarTitleFg,

    // activityBarTop (VS Code 1.88+)
    'activityBarTop.foreground': actFg,
    'activityBarTop.activeBorder': actBadgeBg,
    'activityBarTop.inactiveForeground': actInactive,
    'activityBarTop.dropBorder': actFg,

    // chat / inlineChat / inlineEdit (Copilot chat & edit surfaces)
    'chat.requestBackground': withAlpha(sideBarBg, '80'),
    'chat.requestBorder': sideBarBorder,
    'chat.avatarBackground': palette.activityBarBg,
    'chat.avatarForeground': actFg,
    'chat.slashCommandBackground': withAlpha(border, '33'),
    'chat.slashCommandForeground': keyword,
    'chat.linesAddedForeground': '#a6e422',
    'chat.linesDeletedForeground': '#ff487b',

    'inlineChat.background': sideBarBg,
    'inlineChat.border': sideBarBorder,
    'inlineChat.shadow': withAlpha(bg, '80'),
    'inlineChatInput.border': border,
    'inlineChatInput.focusBorder': focusBorder,
    'inlineChatInput.placeholderForeground': '#cccccc80',
    'inlineChatInput.background': bg,
    'inlineChatDiff.inserted': withAlpha(keyword, '1f'),

    'inlineEdit.indicator.foreground': keyword,
    'inlineEdit.indicator.background': sideBarBg,
    'inlineEdit.indicator.border': border,
    'inlineEdit.modifiedBackground': withAlpha(keyword, '14'),
    'inlineEdit.modifiedChangedLineBackground': withAlpha(keyword, '1f'),
    'inlineEdit.modifiedChangedTextBackground': withAlpha(keyword, '33'),
    'inlineEdit.originalBackground': withAlpha(primaryVar, '14'),
    'inlineEdit.originalChangedLineBackground': withAlpha(primaryVar, '1f'),
    'inlineEdit.originalChangedTextBackground': withAlpha(primaryVar, '33'),

    // stickyScroll (Editor & SideBar)
    'editorStickyScroll.shadow': withAlpha(bg, '80'),
    'sideBarStickyScroll.background': sideBarBg,
    'sideBarStickyScroll.border': sideBarBorder,
    'sideBarStickyScroll.shadow': withAlpha(bg, '80'),

    // multiDiffEditor (VS Code 1.86+)
    'multiDiffEditor.headerBackground': sideBarBg,
    'multiDiffEditor.background': bg,
    'multiDiffEditor.border': sideBarBorder,

    // symbolIcon suite (Breadcrumbs, Quick Pick, Autocomplete)
    'symbolIcon.arrayForeground': constant,
    'symbolIcon.booleanForeground': constant,
    'symbolIcon.classForeground': type,
    'symbolIcon.colorForeground': op,
    'symbolIcon.constantForeground': constant,
    'symbolIcon.constructorForeground': fn,
    'symbolIcon.enumeratorForeground': type,
    'symbolIcon.enumeratorMemberForeground': op,
    'symbolIcon.eventForeground': constant,
    'symbolIcon.fieldForeground': primaryVar,
    'symbolIcon.fileForeground': '#cccccc',
    'symbolIcon.folderForeground': keyword,
    'symbolIcon.functionForeground': fn,
    'symbolIcon.interfaceForeground': keyword,
    'symbolIcon.keyForeground': primaryVar,
    'symbolIcon.keywordForeground': keyword,
    'symbolIcon.methodForeground': fn,
    'symbolIcon.moduleForeground': type,
    'symbolIcon.namespaceForeground': type,
    'symbolIcon.nullForeground': constant,
    'symbolIcon.numberForeground': constant,
    'symbolIcon.objectForeground': type,
    'symbolIcon.operatorForeground': op,
    'symbolIcon.packageForeground': keyword,
    'symbolIcon.propertyForeground': primaryVar,
    'symbolIcon.referenceForeground': fn,
    'symbolIcon.snippetForeground': keyword,
    'symbolIcon.stringForeground': str,
    'symbolIcon.structForeground': type,
    'symbolIcon.textForeground': '#cccccc',
    'symbolIcon.typeParameterForeground': keyword,
    'symbolIcon.unitForeground': constant,
    'symbolIcon.variableForeground': primaryVar,

    // indent guides & bracket pair guides (Levels 1-6)
    'editorIndentGuide.background1': withAlpha(brackets[0], '33'),
    'editorIndentGuide.background2': withAlpha(brackets[1], '33'),
    'editorIndentGuide.background3': withAlpha(brackets[2], '33'),
    'editorIndentGuide.background4': withAlpha(brackets[3], '33'),
    'editorIndentGuide.background5': withAlpha(brackets[4], '33'),
    'editorIndentGuide.background6': withAlpha(brackets[5], '33'),
    'editorIndentGuide.activeBackground1': withAlpha(brackets[0], '80'),
    'editorIndentGuide.activeBackground2': withAlpha(brackets[1], '80'),
    'editorIndentGuide.activeBackground3': withAlpha(brackets[2], '80'),
    'editorIndentGuide.activeBackground4': withAlpha(brackets[3], '80'),
    'editorIndentGuide.activeBackground5': withAlpha(brackets[4], '80'),
    'editorIndentGuide.activeBackground6': withAlpha(brackets[5], '80'),
    'editorBracketPairGuide.background1': withAlpha(brackets[0], '33'),
    'editorBracketPairGuide.background2': withAlpha(brackets[1], '33'),
    'editorBracketPairGuide.background3': withAlpha(brackets[2], '33'),
    'editorBracketPairGuide.background4': withAlpha(brackets[3], '33'),
    'editorBracketPairGuide.background5': withAlpha(brackets[4], '33'),
    'editorBracketPairGuide.background6': withAlpha(brackets[5], '33'),
    'editorBracketPairGuide.activeBackground1': withAlpha(brackets[0], '80'),
    'editorBracketPairGuide.activeBackground2': withAlpha(brackets[1], '80'),
    'editorBracketPairGuide.activeBackground3': withAlpha(brackets[2], '80'),
    'editorBracketPairGuide.activeBackground4': withAlpha(brackets[3], '80'),
    'editorBracketPairGuide.activeBackground5': withAlpha(brackets[4], '80'),
    'editorBracketPairGuide.activeBackground6': withAlpha(brackets[5], '80')
  };
}

// --- Semantic Palettes ---
const PALETTES = {
  neon: {
    id: 'neon',
    name: 'Neon Shimmer',
    filename: 'themes/neon.json',
    bg: '#000000',
    slots: {
      primaryVar: '#ff487b',
      keyword: '#04d9c4',
      constant: '#ffdf7e',
      string: '#d6f9ff', // Soft Ice Cyan base Neon strings
      plainText: '#ffffff',
      type: '#f942ff',
      function: '#8968ff',
      operator: '#ff845e',
      comment: '#7f848eea', // WCAG 2.1 AA contrast verified (alpha 91.8%)
      error: '#ff1c5b'
    },
    brackets: ['#ff487b', '#8968ff', '#04d9c4', '#ffdf7e', '#f942ff', '#ff845e'],
    sideBarBg: '#0f0011',
    sideBarBorder: '#ee4cfc1c',
    sideBarTitleFg: '#ee4cfc76',
    activityBarBg: '#150b01',
    activityBarFg: '#f5a349',
    activityBarInactiveFg: '#f5a34962',
    activityBarBadgeBg: '#fc6f4c',
    statusBarBg: '#11002c',
    focusBorder: '#ee4cfc',
    border: '#8e4af57a'
  },
  red: {
    id: 'red',
    name: 'Neon Shimmer // Crimson Drive',
    filename: 'themes/red.json',
    bg: '#0A0103',
    slots: {
      primaryVar: '#E64471',
      keyword: '#FFFFFF',
      constant: '#FFDF7E',
      string: '#FFB3D9',
      plainText: '#FFB3D9',
      type: '#FF487B',
      function: '#FF845E',
      operator: '#F22294',
      comment: '#7f848eea',
      error: '#FF1C5B'
    },
    brackets: ['#E64471', '#FF845E', '#FFB3D9', '#FFDF7E', '#FF487B', '#F22294'],
    sideBarBg: '#120205',
    sideBarBorder: '#E644711c',
    sideBarTitleFg: '#E6447176',
    activityBarBg: '#170308',
    activityBarFg: '#FF487B',
    activityBarInactiveFg: '#FF487B62',
    activityBarBadgeBg: '#FF845E',
    statusBarBg: '#1A040B',
    focusBorder: '#E64471',
    border: '#B3244F7a'
  },
  pink: {
    id: 'pink',
    name: 'Neon Shimmer // Bubblegum Punk',
    filename: 'themes/pink.json',
    bg: '#080006',
    slots: {
      primaryVar: '#F22294',
      keyword: '#FFFFFF',
      constant: '#FFDF7E',
      string: '#FFD9F2',
      plainText: '#FFD9F2',
      type: '#EE4CFC',
      function: '#EE05F2',
      operator: '#A366FF', // WCAG 2.1 AA Pink operators (#A366FF >= 4.5:1)
      comment: '#7f848eea',
      error: '#FF1C5B'
    },
    brackets: ['#F22294', '#EE05F2', '#FFFFFF', '#FFDF7E', '#EE4CFC', '#A366FF'],
    sideBarBg: '#0F000B',
    sideBarBorder: '#EE4CFC1c',
    sideBarTitleFg: '#EE4CFC76',
    activityBarBg: '#14000F',
    activityBarFg: '#F22294',
    activityBarInactiveFg: '#F2229462',
    activityBarBadgeBg: '#EE05F2',
    statusBarBg: '#170012',
    focusBorder: '#EE4CFC',
    border: '#D414A87a'
  },
  purple: {
    id: 'purple',
    name: 'Neon Shimmer // Amethyst Core',
    filename: 'themes/purple.json',
    bg: '#070012',
    slots: {
      primaryVar: '#9D5EFF', // WCAG 2.1 AA Purple variables (#9D5EFF >= 4.5:1)
      keyword: '#04D9C4',
      constant: '#EE4CFC',
      string: '#E6D9FF',
      plainText: '#E6D9FF',
      type: '#D1A3FF',
      function: '#B377FF',
      operator: '#FFFFFF',
      comment: '#7f848eea',
      error: '#FF1C5B'
    },
    brackets: ['#9D5EFF', '#B377FF', '#04D9C4', '#EE4CFC', '#D1A3FF', '#FFFFFF'],
    sideBarBg: '#0D001F',
    sideBarBorder: '#B377FF1c',
    sideBarTitleFg: '#B377FF76',
    activityBarBg: '#110029',
    activityBarFg: '#9D5EFF',
    activityBarInactiveFg: '#9D5EFF62',
    activityBarBadgeBg: '#D1A3FF',
    statusBarBg: '#140033',
    focusBorder: '#B377FF',
    border: '#8E4AF57a'
  },
  green: {
    id: 'green',
    name: 'Neon Shimmer // Acid Chemtech',
    filename: 'themes/green.json',
    bg: '#010C07',
    slots: {
      primaryVar: '#00FF88',
      keyword: '#FFFFFF',
      constant: '#FFDF7E',
      string: '#D4FFF0',
      plainText: '#D4FFF0',
      type: '#C3FF00',
      function: '#00E5FF',
      operator: '#FF7A00',
      comment: '#7f848eea',
      error: '#FF1C5B'
    },
    brackets: ['#00FF88', '#00E5FF', '#C3FF00', '#FFDF7E', '#FF7A00', '#D4FFF0'],
    sideBarBg: '#010E09',
    sideBarBorder: '#00FF881c',
    sideBarTitleFg: '#00FF8876',
    activityBarBg: '#010905',
    activityBarFg: '#00FF88',
    activityBarInactiveFg: '#00FF8862',
    activityBarBadgeBg: '#00E5FF',
    statusBarBg: '#01140A',
    focusBorder: '#00FF88',
    border: '#00B36B7a'
  },
  amber: {
    id: 'amber',
    name: 'Neon Shimmer // Solar Amber',
    filename: 'themes/amber.json',
    bg: '#0A0702',
    slots: {
      primaryVar: '#FFB800',
      keyword: '#04D9C4',
      constant: '#FFEE55',
      string: '#FFF3D6',
      plainText: '#FFF3D6',
      type: '#FFAA33',
      function: '#FF5436',
      operator: '#FF3388',
      comment: '#7f848eea',
      error: '#FF1C5B'
    },
    brackets: ['#FFB800', '#FF5436', '#04D9C4', '#FFEE55', '#FFAA33', '#FF3388'],
    sideBarBg: '#0D0903',
    sideBarBorder: '#FFAA331c',
    sideBarTitleFg: '#FFAA3376',
    activityBarBg: '#080501',
    activityBarFg: '#FFB800',
    activityBarInactiveFg: '#FFB80062',
    activityBarBadgeBg: '#FF5436',
    statusBarBg: '#140E04',
    focusBorder: '#FFAA33',
    border: '#D488007a'
  }
};

// --- Canonical Base Data ---
const TOKEN_TEMPLATES = [
  {
    "slot": "primaryVar",
    "name": "unison punctuation",
    "scope": "punctuation.definition.delayed.unison,punctuation.definition.list.begin.unison,punctuation.definition.list.end.unison,punctuation.definition.ability.begin.unison,punctuation.definition.ability.end.unison,punctuation.operator.assignment.as.unison,punctuation.separator.pipe.unison,punctuation.separator.delimiter.unison,punctuation.definition.hash.unison"
  },
  {
    "slot": "keyword",
    "name": "haskell variable generic-type",
    "scope": "variable.other.generic-type.haskell"
  },
  {
    "slot": "constant",
    "name": "haskell storage type",
    "scope": "storage.type.haskell"
  },
  {
    "slot": "primaryVar",
    "name": "support.variable.magic.python",
    "scope": "support.variable.magic.python"
  },
  {
    "slot": "plainText",
    "name": "punctuation.separator.parameters.python",
    "scope": "punctuation.separator.period.python,punctuation.separator.element.python,punctuation.parenthesis.begin.python,punctuation.parenthesis.end.python"
  },
  {
    "slot": "type",
    "name": "variable.parameter.function.language.special.self.python",
    "scope": "variable.parameter.function.language.special.self.python"
  },
  {
    "slot": "plainText",
    "name": "storage.modifier.lifetime.rust",
    "scope": "storage.modifier.lifetime.rust"
  },
  {
    "slot": "function",
    "name": "support.function.std.rust",
    "scope": "support.function.std.rust"
  },
  {
    "slot": "type",
    "name": "entity.name.lifetime.rust",
    "scope": "entity.name.lifetime.rust"
  },
  {
    "slot": "primaryVar",
    "name": "variable.language.rust",
    "scope": "variable.language.rust"
  },
  {
    "slot": "keyword",
    "name": "support.constant.edge",
    "scope": "support.constant.edge"
  },
  {
    "slot": "primaryVar",
    "name": "regexp constant character-class",
    "scope": "constant.other.character-class.regexp"
  },
  {
    "slot": "constant",
    "name": "regexp operator.quantifier",
    "scope": "keyword.operator.quantifier.regexp"
  },
  {
    "slot": "string",
    "name": "punctuation.definition",
    "scope": "punctuation.definition.string.begin,punctuation.definition.string.end"
  },
  {
    "slot": "plainText",
    "name": "Text",
    "scope": "variable.parameter.function"
  },
  {
    "slot": "comment",
    "name": "Comment Markup Link",
    "scope": "comment markup.link"
  },
  {
    "slot": "type",
    "name": "markup diff",
    "scope": "markup.changed.diff"
  },
  {
    "slot": "function",
    "name": "diff",
    "scope": "meta.diff.header.from-file,meta.diff.header.to-file,punctuation.definition.from-file.diff,punctuation.definition.to-file.diff"
  },
  {
    "slot": "plainText",
    "name": "inserted.diff",
    "scope": "markup.inserted.diff"
  },
  {
    "slot": "primaryVar",
    "name": "deleted.diff",
    "scope": "markup.deleted.diff"
  },
  {
    "slot": "primaryVar",
    "name": "c++ function",
    "scope": "meta.function.c,meta.function.cpp"
  },
  {
    "slot": "plainText",
    "name": "c++ block",
    "scope": "punctuation.section.block.begin.bracket.curly.cpp,punctuation.section.block.end.bracket.curly.cpp,punctuation.terminator.statement.c,punctuation.section.block.begin.bracket.curly.c,punctuation.section.block.end.bracket.curly.c,punctuation.section.parens.begin.bracket.round.c,punctuation.section.parens.end.bracket.round.c,punctuation.section.parameters.begin.bracket.round.c,punctuation.section.parameters.end.bracket.round.c"
  },
  {
    "slot": "plainText",
    "name": "js/ts punctuation separator key-value",
    "scope": "punctuation.separator.key-value"
  },
  {
    "slot": "function",
    "name": "js/ts import keyword",
    "scope": "keyword.operator.expression.import"
  },
  {
    "slot": "type",
    "name": "math js/ts",
    "scope": "support.constant.math"
  },
  {
    "slot": "constant",
    "name": "math property js/ts",
    "scope": "support.constant.property.math"
  },
  {
    "slot": "type",
    "name": "js/ts variable.other.constant",
    "scope": "variable.other.constant"
  },
  {
    "slot": "type",
    "name": "java type",
    "scope": [
      "storage.type.annotation.java",
      "storage.type.object.array.java"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "java source",
    "scope": "source.java"
  },
  {
    "slot": "plainText",
    "name": "java punctuation",
    "scope": "punctuation.section.block.begin.java,punctuation.section.block.end.java,punctuation.definition.method-parameters.begin.java,punctuation.definition.method-parameters.end.java,meta.method.identifier.java,punctuation.section.method.begin.java,punctuation.section.method.end.java,punctuation.terminator.java,punctuation.section.class.begin.java,punctuation.section.class.end.java,punctuation.section.inner-class.begin.java,punctuation.section.inner-class.end.java,meta.method-call.java,punctuation.section.class.begin.bracket.curly.java,punctuation.section.class.end.bracket.curly.java,punctuation.section.method.begin.bracket.curly.java,punctuation.section.method.end.bracket.curly.java,punctuation.separator.period.java,punctuation.bracket.angle.java,punctuation.definition.annotation.java,meta.method.body.java"
  },
  {
    "slot": "function",
    "name": "java method",
    "scope": "meta.method.java"
  },
  {
    "slot": "type",
    "name": "java storage/import",
    "scope": "storage.modifier.import.java,storage.type.java,storage.type.generic.java"
  },
  {
    "slot": "keyword",
    "name": "java instanceof",
    "scope": "keyword.operator.instanceof.java"
  },
  {
    "slot": "primaryVar",
    "name": "java variable.name",
    "scope": "meta.definition.variable.name.java"
  },
  {
    "slot": "operator",
    "name": "operator logical",
    "scope": "keyword.operator.logical"
  },
  {
    "slot": "operator",
    "name": "operator bitwise",
    "scope": "keyword.operator.bitwise"
  },
  {
    "slot": "operator",
    "name": "operator channel",
    "scope": "keyword.operator.channel"
  },
  {
    "slot": "constant",
    "name": "support.constant.property-value.scss",
    "scope": "support.constant.property-value.scss,support.constant.property-value.css"
  },
  {
    "slot": "operator",
    "name": "CSS/SCSS/LESS Operators",
    "scope": "keyword.operator.css,keyword.operator.scss"
  },
  {
    "slot": "constant",
    "name": "css color standard name",
    "scope": "support.constant.color.w3c-standard-color-name.css,support.constant.color.w3c-standard-color-name.scss"
  },
  {
    "slot": "plainText",
    "name": "css comma",
    "scope": "punctuation.separator.list.comma.css"
  },
  {
    "slot": "constant",
    "name": "css attribute-name.id",
    "scope": "entity.other.attribute-name.id.css"
  },
  {
    "slot": "operator",
    "name": "css property-name",
    "scope": "support.type.vendored.property-name.css"
  },
  {
    "slot": "type",
    "name": "js/ts module",
    "scope": "support.module.node,support.type.object.module"
  },
  {
    "slot": "type",
    "name": "entity.name.type.module",
    "scope": "entity.name.type.module"
  },
  {
    "slot": "primaryVar",
    "name": "js variable readwrite",
    "scope": "variable.other.readwrite,meta.object-literal.key,support.variable.property,support.variable.object.process,support.variable.object.node"
  },
  {
    "slot": "constant",
    "name": "js/ts json",
    "scope": "support.constant.json"
  },
  {
    "slot": "keyword",
    "name": "js/ts Keyword",
    "scope": [
      "keyword.operator.expression.instanceof",
      "keyword.operator.new",
      "keyword.operator.ternary",
      "keyword.operator.optional",
      "keyword.operator.expression.keyof"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "js/ts console",
    "scope": "support.type.object.console"
  },
  {
    "slot": "constant",
    "name": "js/ts support.variable.property.process",
    "scope": "support.variable.property.process"
  },
  {
    "slot": "function",
    "name": "js console function",
    "scope": "support.function.console"
  },
  {
    "slot": "plainText",
    "name": "keyword.operator.misc.rust",
    "scope": "keyword.operator.misc.rust"
  },
  {
    "slot": "keyword",
    "name": "keyword.operator.sigil.rust",
    "scope": "keyword.operator.sigil.rust"
  },
  {
    "slot": "keyword",
    "name": "operator",
    "scope": "keyword.operator.delete"
  },
  {
    "slot": "operator",
    "name": "js dom",
    "scope": "support.type.object.dom"
  },
  {
    "slot": "primaryVar",
    "name": "js dom variable",
    "scope": "support.variable.dom,support.variable.property.dom"
  },
  {
    "slot": "operator",
    "name": "keyword.operator",
    "scope": "keyword.operator.arithmetic,keyword.operator.comparison,keyword.operator.decrement,keyword.operator.increment,keyword.operator.relational"
  },
  {
    "slot": "keyword",
    "name": "C operator assignment",
    "scope": "keyword.operator.assignment.c,keyword.operator.comparison.c,keyword.operator.c,keyword.operator.increment.c,keyword.operator.decrement.c,keyword.operator.bitwise.shift.c,keyword.operator.assignment.cpp,keyword.operator.comparison.cpp,keyword.operator.cpp,keyword.operator.increment.cpp,keyword.operator.decrement.cpp,keyword.operator.bitwise.shift.cpp"
  },
  {
    "slot": "plainText",
    "name": "Punctuation",
    "scope": "punctuation.separator.delimiter"
  },
  {
    "slot": "keyword",
    "name": "Other punctuation .c",
    "scope": "punctuation.separator.c,punctuation.separator.cpp"
  },
  {
    "slot": "operator",
    "name": "C type posix-reserved",
    "scope": "support.type.posix-reserved.c,support.type.posix-reserved.cpp"
  },
  {
    "slot": "keyword",
    "name": "keyword.operator.sizeof.c",
    "scope": "keyword.operator.sizeof.c,keyword.operator.sizeof.cpp"
  },
  {
    "slot": "constant",
    "name": "python parameter",
    "scope": "variable.parameter.function.language.python"
  },
  {
    "slot": "operator",
    "name": "python type",
    "scope": "support.type.python"
  },
  {
    "slot": "keyword",
    "name": "python logical",
    "scope": "keyword.operator.logical.python"
  },
  {
    "slot": "constant",
    "name": "pyCs",
    "scope": "variable.parameter.function.python"
  },
  {
    "slot": "plainText",
    "name": "python block",
    "scope": "punctuation.definition.arguments.begin.python,punctuation.definition.arguments.end.python,punctuation.separator.arguments.python,punctuation.definition.list.begin.python,punctuation.definition.list.end.python"
  },
  {
    "slot": "function",
    "name": "python function-call.generic",
    "scope": "meta.function-call.generic.python"
  },
  {
    "slot": "constant",
    "name": "python placeholder reset to normal string",
    "scope": "constant.character.format.placeholder.other.python"
  },
  {
    "slot": "plainText",
    "name": "Operators",
    "scope": "keyword.operator"
  },
  {
    "slot": "keyword",
    "name": "Compound Assignment Operators",
    "scope": "keyword.operator.assignment.compound"
  },
  {
    "slot": "operator",
    "name": "Compound Assignment Operators js/ts",
    "scope": "keyword.operator.assignment.compound.js,keyword.operator.assignment.compound.ts"
  },
  {
    "slot": "keyword",
    "name": "Keywords",
    "scope": "keyword"
  },
  {
    "slot": "type",
    "name": "Namespaces",
    "scope": "entity.name.namespace"
  },
  {
    "slot": "primaryVar",
    "name": "Variables",
    "scope": "variable"
  },
  {
    "slot": "plainText",
    "name": "Variables",
    "scope": "variable.c"
  },
  {
    "slot": "type",
    "name": "Language variables",
    "scope": "variable.language"
  },
  {
    "slot": "plainText",
    "name": "Java Variables",
    "scope": "token.variable.parameter.java"
  },
  {
    "slot": "type",
    "name": "Java Imports",
    "scope": "import.storage.java"
  },
  {
    "slot": "keyword",
    "name": "Packages",
    "scope": "token.package.keyword"
  },
  {
    "slot": "plainText",
    "name": "Packages",
    "scope": "token.package"
  },
  {
    "slot": "function",
    "name": "Functions",
    "scope": [
      "entity.name.function",
      "meta.require",
      "support.function.any-method",
      "variable.function"
    ]
  },
  {
    "slot": "type",
    "name": "Classes (namespace)",
    "scope": "entity.name.type.namespace"
  },
  {
    "slot": "type",
    "name": "Classes (support/entity)",
    "scope": "support.class, entity.name.type.class"
  },
  {
    "slot": "type",
    "name": "Class name",
    "scope": "entity.name.class.identifier.namespace.type"
  },
  {
    "slot": "type",
    "name": "Class name",
    "scope": [
      "entity.name.class",
      "variable.other.class.js",
      "variable.other.class.ts"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "Class name php",
    "scope": "variable.other.class.php"
  },
  {
    "slot": "type",
    "name": "Type Name",
    "scope": "entity.name.type"
  },
  {
    "slot": "keyword",
    "name": "Keyword Control",
    "scope": "keyword.control"
  },
  {
    "slot": "constant",
    "name": "Control Elements",
    "scope": "control.elements, keyword.operator.less"
  },
  {
    "slot": "function",
    "name": "Methods",
    "scope": "keyword.other.special-method"
  },
  {
    "slot": "keyword",
    "name": "Storage",
    "scope": "storage"
  },
  {
    "slot": "keyword",
    "name": "Storage JS TS",
    "scope": "token.storage"
  },
  {
    "slot": "keyword",
    "name": "Source Js Keyword Operator Delete,source Js Keyword Operator In,source Js Keyword Operator Of,source Js Keyword Operator Instanceof,source Js Keyword Operator New,source Js Keyword Operator Typeof,source Js Keyword Operator Void",
    "scope": "keyword.operator.expression.delete,keyword.operator.expression.in,keyword.operator.expression.of,keyword.operator.expression.typeof,keyword.operator.expression.void"
  },
  {
    "slot": "type",
    "name": "Java Storage",
    "scope": "token.storage.type.java"
  },
  {
    "slot": "operator",
    "name": "Support",
    "scope": "support.function"
  },
  {
    "slot": "plainText",
    "name": "Support type property-name",
    "scope": "support.type.property-name"
  },
  {
    "slot": "plainText",
    "name": "Support constant property-value",
    "scope": "support.constant.property-value"
  },
  {
    "slot": "constant",
    "name": "Support constant font-name",
    "scope": "support.constant.font-name"
  },
  {
    "slot": "plainText",
    "name": "Meta tag",
    "scope": "meta.tag"
  },
  {
    "slot": "string",
    "name": "Strings",
    "scope": "string"
  },
  {
    "slot": "type",
    "name": "Inherited Class",
    "scope": "entity.other.inherited-class"
  },
  {
    "slot": "operator",
    "name": "Constant other symbol",
    "scope": "constant.other.symbol"
  },
  {
    "slot": "constant",
    "name": "Integers",
    "scope": "constant.numeric"
  },
  {
    "slot": "constant",
    "name": "Constants (general)",
    "scope": "constant"
  },
  {
    "slot": "constant",
    "name": "Constant definition",
    "scope": "punctuation.definition.constant"
  },
  {
    "slot": "primaryVar",
    "name": "Tags",
    "scope": "entity.name.tag"
  },
  {
    "slot": "constant",
    "name": "Attributes",
    "scope": "entity.other.attribute-name"
  },
  {
    "slot": "function",
    "name": "Attribute IDs",
    "scope": "entity.other.attribute-name.id",
    "fontStyle": "normal"
  },
  {
    "slot": "constant",
    "name": "Attribute class",
    "scope": "entity.other.attribute-name.class.css",
    "fontStyle": "normal"
  },
  {
    "slot": "keyword",
    "name": "Selector",
    "scope": "meta.selector"
  },
  {
    "slot": "primaryVar",
    "name": "Headings",
    "scope": "markup.heading"
  },
  {
    "slot": "function",
    "name": "Headings",
    "scope": "markup.heading punctuation.definition.heading, entity.name.section"
  },
  {
    "slot": "primaryVar",
    "name": "Units",
    "scope": "keyword.other.unit"
  },
  {
    "slot": "constant",
    "name": "Bold",
    "scope": "markup.bold,todo.bold"
  },
  {
    "slot": "type",
    "name": "Bold",
    "scope": "punctuation.definition.bold"
  },
  {
    "slot": "keyword",
    "name": "markup Italic",
    "scope": "markup.italic, punctuation.definition.italic,todo.emphasis"
  },
  {
    "slot": "keyword",
    "name": "emphasis md",
    "scope": "emphasis md"
  },
  {
    "slot": "primaryVar",
    "name": "[VSCODE-CUSTOM] Markdown headings",
    "scope": "entity.name.section.markdown"
  },
  {
    "slot": "primaryVar",
    "name": "[VSCODE-CUSTOM] Markdown heading Punctuation Definition",
    "scope": "punctuation.definition.heading.markdown"
  },
  {
    "slot": "primaryVar",
    "name": "punctuation.definition.list.begin.markdown",
    "scope": "punctuation.definition.list.begin.markdown"
  },
  {
    "slot": "plainText",
    "name": "[VSCODE-CUSTOM] Markdown heading setext",
    "scope": "markup.heading.setext"
  },
  {
    "slot": "constant",
    "name": "[VSCODE-CUSTOM] Markdown Punctuation Definition Bold",
    "scope": "punctuation.definition.bold.markdown"
  },
  {
    "slot": "plainText",
    "name": "[VSCODE-CUSTOM] Markdown Inline Raw",
    "scope": "markup.inline.raw.markdown"
  },
  {
    "slot": "plainText",
    "name": "[VSCODE-CUSTOM] Markdown Inline Raw",
    "scope": "markup.inline.raw.string.markdown"
  },
  {
    "slot": "primaryVar",
    "name": "[VSCODE-CUSTOM] Markdown List Punctuation Definition",
    "scope": "punctuation.definition.list.markdown"
  },
  {
    "slot": "primaryVar",
    "name": "[VSCODE-CUSTOM] Markdown Punctuation Definition String",
    "scope": [
      "punctuation.definition.string.begin.markdown",
      "punctuation.definition.string.end.markdown"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "beginning.punctuation.definition.list.markdown",
    "scope": [
      "beginning.punctuation.definition.list.markdown"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "[VSCODE-CUSTOM] Markdown Punctuation Definition Link",
    "scope": "punctuation.definition.metadata.markdown"
  },
  {
    "slot": "keyword",
    "name": "[VSCODE-CUSTOM] Markdown Underline Link/Image",
    "scope": "markup.underline.link.markdown,markup.underline.link.image.markdown"
  },
  {
    "slot": "function",
    "name": "[VSCODE-CUSTOM] Markdown Link Title/Description",
    "scope": "string.other.link.title.markdown,string.other.link.description.markdown"
  },
  {
    "slot": "operator",
    "name": "Regular Expressions",
    "scope": "string.regexp"
  },
  {
    "slot": "operator",
    "name": "Escape Characters",
    "scope": "constant.character.escape"
  },
  {
    "slot": "primaryVar",
    "name": "Embedded",
    "scope": "variable.interpolation"
  },
  {
    "slot": "keyword",
    "name": "Embedded",
    "scope": "punctuation.section.embedded.begin,punctuation.section.embedded.end"
  },
  {
    "slot": "error",
    "name": "illegal",
    "scope": "invalid.illegal"
  },
  {
    "slot": "error",
    "name": "illegal",
    "scope": "invalid.illegal.bad-ampersand.html"
  },
  {
    "slot": "error",
    "name": "Broken",
    "scope": "invalid.broken"
  },
  {
    "slot": "error",
    "name": "Deprecated",
    "scope": "invalid.deprecated"
  },
  {
    "slot": "error",
    "name": "Unimplemented",
    "scope": "invalid.unimplemented"
  },
  {
    "slot": "primaryVar",
    "name": "Source Json Meta Structure Dictionary Json > String Quoted Json",
    "scope": "source.json meta.structure.dictionary.json > string.quoted.json"
  },
  {
    "slot": "primaryVar",
    "name": "Source Json Meta Structure Dictionary Json > String Quoted Json > Punctuation String",
    "scope": "source.json meta.structure.dictionary.json > string.quoted.json > punctuation.string"
  },
  {
    "slot": "string",
    "name": "Source Json Meta Structure Dictionary Json > Value Json > String Quoted Json,source Json Meta Structure Array Json > Value Json > String Quoted Json,source Json Meta Structure Dictionary Json > Value Json > String Quoted Json > Punctuation,source Json Meta Structure Array Json > Value Json > String Quoted Json > Punctuation",
    "scope": "source.json meta.structure.dictionary.json > value.json > string.quoted.json,source.json meta.structure.array.json > value.json > string.quoted.json,source.json meta.structure.dictionary.json > value.json > string.quoted.json > punctuation,source.json meta.structure.array.json > value.json > string.quoted.json > punctuation"
  },
  {
    "slot": "operator",
    "name": "Source Json Meta Structure Dictionary Json > Constant Language Json,source Json Meta Structure Array Json > Constant Language Json",
    "scope": "source.json meta.structure.dictionary.json > constant.language.json,source.json meta.structure.array.json > constant.language.json"
  },
  {
    "slot": "primaryVar",
    "name": "[VSCODE-CUSTOM] JSON Property Name",
    "scope": "support.type.property-name.json"
  },
  {
    "slot": "primaryVar",
    "name": "[VSCODE-CUSTOM] JSON Punctuation for Property Name",
    "scope": "support.type.property-name.json punctuation"
  },
  {
    "slot": "keyword",
    "name": "laravel blade tag",
    "scope": "text.html.laravel-blade source.php.embedded.line.html entity.name.tag.laravel-blade"
  },
  {
    "slot": "keyword",
    "name": "laravel blade @",
    "scope": "text.html.laravel-blade source.php.embedded.line.html support.constant.laravel-blade"
  },
  {
    "slot": "type",
    "name": "use statement for other classes",
    "scope": "support.other.namespace.use.php,support.other.namespace.use-as.php,support.other.namespace.php,entity.other.alias.php,meta.interface.php"
  },
  {
    "slot": "keyword",
    "name": "error suppression",
    "scope": "keyword.operator.error-control.php"
  },
  {
    "slot": "keyword",
    "name": "php instanceof",
    "scope": "keyword.operator.type.php"
  },
  {
    "slot": "plainText",
    "name": "style double quoted array index normal begin",
    "scope": "punctuation.section.array.begin.php"
  },
  {
    "slot": "plainText",
    "name": "style double quoted array index normal end",
    "scope": "punctuation.section.array.end.php"
  },
  {
    "slot": "error",
    "name": "php illegal.non-null-typehinted",
    "scope": "invalid.illegal.non-null-typehinted.php"
  },
  {
    "slot": "type",
    "name": "php types",
    "scope": "storage.type.php,meta.other.type.phpdoc.php,keyword.other.type.php,keyword.other.array.phpdoc.php"
  },
  {
    "slot": "function",
    "name": "php call-function",
    "scope": "meta.function-call.php,meta.function-call.object.php,meta.function-call.static.php"
  },
  {
    "slot": "plainText",
    "name": "php function-resets",
    "scope": "punctuation.definition.parameters.begin.bracket.round.php,punctuation.definition.parameters.end.bracket.round.php,punctuation.separator.delimiter.php,punctuation.section.scope.begin.php,punctuation.section.scope.end.php,punctuation.terminator.expression.php,punctuation.definition.arguments.begin.bracket.round.php,punctuation.definition.arguments.end.bracket.round.php,punctuation.definition.storage-type.begin.bracket.round.php,punctuation.definition.storage-type.end.bracket.round.php,punctuation.definition.array.begin.bracket.round.php,punctuation.definition.array.end.bracket.round.php,punctuation.definition.begin.bracket.round.php,punctuation.definition.end.bracket.round.php,punctuation.definition.begin.bracket.curly.php,punctuation.definition.end.bracket.curly.php,punctuation.definition.section.switch-block.end.bracket.curly.php,punctuation.definition.section.switch-block.start.bracket.curly.php,punctuation.definition.section.switch-block.begin.bracket.curly.php"
  },
  {
    "slot": "constant",
    "name": "support rust constants",
    "scope": "support.constant.core.rust"
  },
  {
    "slot": "constant",
    "name": "support php constants",
    "scope": "support.constant.ext.php,support.constant.std.php,support.constant.core.php,support.constant.parser-token.php"
  },
  {
    "slot": "function",
    "name": "php goto",
    "scope": "entity.name.goto-label.php,support.other.php"
  },
  {
    "slot": "operator",
    "name": "php logical/bitwise operator",
    "scope": "keyword.operator.logical.php,keyword.operator.bitwise.php,keyword.operator.arithmetic.php"
  },
  {
    "slot": "keyword",
    "name": "php regexp operator",
    "scope": "keyword.operator.regexp.php"
  },
  {
    "slot": "operator",
    "name": "php comparison",
    "scope": "keyword.operator.comparison.php"
  },
  {
    "slot": "keyword",
    "name": "php heredoc/nowdoc",
    "scope": "keyword.operator.heredoc.php,keyword.operator.nowdoc.php"
  },
  {
    "slot": "function",
    "name": "python function decorator @",
    "scope": "meta.function.decorator.python"
  },
  {
    "slot": "operator",
    "name": "python function support",
    "scope": "support.token.decorator.python,meta.function.decorator.identifier.python"
  },
  {
    "slot": "plainText",
    "name": "parameter function js/ts",
    "scope": "function.parameter"
  },
  {
    "slot": "plainText",
    "name": "brace function",
    "scope": "function.brace"
  },
  {
    "slot": "plainText",
    "name": "parameter function ruby cs",
    "scope": "function.parameter.ruby, function.parameter.cs"
  },
  {
    "slot": "operator",
    "name": "constant.language.symbol.ruby",
    "scope": "constant.language.symbol.ruby"
  },
  {
    "slot": "operator",
    "name": "rgb-value",
    "scope": "rgb-value"
  },
  {
    "slot": "constant",
    "name": "rgb value",
    "scope": "inline-color-decoration rgb-value"
  },
  {
    "slot": "constant",
    "name": "rgb value less",
    "scope": "less rgb-value"
  },
  {
    "slot": "primaryVar",
    "name": "sass selector",
    "scope": "selector.sass"
  },
  {
    "slot": "type",
    "name": "ts primitive/builtin types",
    "scope": "support.type.primitive.ts,support.type.builtin.ts,support.type.primitive.tsx,support.type.builtin.tsx"
  },
  {
    "slot": "plainText",
    "name": "block scope",
    "scope": "block.scope.end,block.scope.begin"
  },
  {
    "slot": "type",
    "name": "cs storage type",
    "scope": "storage.type.cs"
  },
  {
    "slot": "primaryVar",
    "name": "cs local variable",
    "scope": "entity.name.variable.local.cs"
  },
  {
    "slot": "function",
    "scope": "token.info-token"
  },
  {
    "slot": "constant",
    "scope": "token.warn-token"
  },
  {
    "slot": "error",
    "scope": "token.error-token"
  },
  {
    "slot": "keyword",
    "scope": "token.debug-token"
  },
  {
    "slot": "keyword",
    "name": "String interpolation",
    "scope": [
      "punctuation.definition.template-expression.begin",
      "punctuation.definition.template-expression.end",
      "punctuation.section.embedded"
    ]
  },
  {
    "slot": "plainText",
    "name": "Reset JavaScript string interpolation expression",
    "scope": [
      "meta.template.expression"
    ]
  },
  {
    "slot": "keyword",
    "name": "Import module JS",
    "scope": [
      "keyword.operator.module"
    ]
  },
  {
    "slot": "function",
    "name": "js Flowtype",
    "scope": [
      "support.type.type.flowtype"
    ]
  },
  {
    "slot": "type",
    "name": "js Flow",
    "scope": [
      "support.type.primitive"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "js class prop",
    "scope": [
      "meta.property.object"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "js func parameter",
    "scope": [
      "variable.parameter.function.js"
    ]
  },
  {
    "slot": "string",
    "name": "js template literals begin",
    "scope": [
      "keyword.other.template.begin"
    ]
  },
  {
    "slot": "string",
    "name": "js template literals end",
    "scope": [
      "keyword.other.template.end"
    ]
  },
  {
    "slot": "plainText",
    "name": "js template literals variable braces begin",
    "scope": [
      "keyword.other.substitution.begin"
    ]
  },
  {
    "slot": "plainText",
    "name": "js template literals variable braces end",
    "scope": [
      "keyword.other.substitution.end"
    ]
  },
  {
    "slot": "operator",
    "name": "js operator.assignment",
    "scope": [
      "keyword.operator.assignment"
    ]
  },
  {
    "slot": "type",
    "name": "go operator",
    "scope": [
      "keyword.operator.assignment.go"
    ]
  },
  {
    "slot": "keyword",
    "name": "go operator",
    "scope": [
      "keyword.operator.arithmetic.go",
      "keyword.operator.address.go"
    ]
  },
  {
    "slot": "type",
    "name": "Go package name",
    "scope": [
      "entity.name.package.go"
    ]
  },
  {
    "slot": "operator",
    "name": "elm prelude",
    "scope": [
      "support.type.prelude.elm"
    ]
  },
  {
    "slot": "constant",
    "name": "elm constant",
    "scope": [
      "support.constant.elm"
    ]
  },
  {
    "slot": "keyword",
    "name": "template literal",
    "scope": [
      "punctuation.quasi.element"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "html/pug (jade) escaped characters and entities",
    "scope": [
      "constant.character.entity"
    ]
  },
  {
    "slot": "operator",
    "name": "styling css pseudo-elements/classes to be able to differentiate from classes which are the same colour",
    "scope": [
      "entity.other.attribute-name.pseudo-element",
      "entity.other.attribute-name.pseudo-class"
    ]
  },
  {
    "slot": "type",
    "name": "Clojure globals",
    "scope": [
      "entity.global.clojure"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "Clojure symbols",
    "scope": [
      "meta.symbol.clojure"
    ]
  },
  {
    "slot": "operator",
    "name": "Clojure constants",
    "scope": [
      "constant.keyword.clojure"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "CoffeeScript Function Argument",
    "scope": [
      "meta.arguments.coffee",
      "variable.parameter.function.coffee"
    ]
  },
  {
    "slot": "plainText",
    "name": "Ini Default Text",
    "scope": [
      "source.ini"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "Makefile prerequisities",
    "scope": [
      "meta.scope.prerequisites.makefile"
    ]
  },
  {
    "slot": "type",
    "name": "Makefile text colour",
    "scope": [
      "source.makefile"
    ]
  },
  {
    "slot": "type",
    "name": "Groovy import names",
    "scope": [
      "storage.modifier.import.groovy"
    ]
  },
  {
    "slot": "function",
    "name": "Groovy Methods",
    "scope": [
      "meta.method.groovy"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "Groovy Variables",
    "scope": [
      "meta.definition.variable.name.groovy"
    ]
  },
  {
    "slot": "plainText",
    "name": "Groovy Inheritance",
    "scope": [
      "meta.definition.class.inherited.classes.groovy"
    ]
  },
  {
    "slot": "type",
    "name": "HLSL Semantic",
    "scope": [
      "support.variable.semantic.hlsl"
    ]
  },
  {
    "slot": "keyword",
    "name": "HLSL Types",
    "scope": [
      "support.type.texture.hlsl",
      "support.type.sampler.hlsl",
      "support.type.object.hlsl",
      "support.type.object.rw.hlsl",
      "support.type.fx.hlsl"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "SQL Variables",
    "scope": [
      "text.variable",
      "text.bracketed"
    ]
  },
  {
    "slot": "type",
    "name": "types",
    "scope": [
      "support.type.swift",
      "support.type.vb.asp"
    ]
  },
  {
    "slot": "type",
    "name": "heading 1, keyword",
    "scope": [
      "entity.name.function.xi"
    ]
  },
  {
    "slot": "operator",
    "name": "heading 2, callable",
    "scope": [
      "entity.name.class.xi"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "heading 3, property",
    "scope": [
      "constant.character.character-class.regexp.xi"
    ]
  },
  {
    "slot": "keyword",
    "name": "heading 4, type, class, interface",
    "scope": [
      "constant.regexp.xi"
    ]
  },
  {
    "slot": "operator",
    "name": "heading 5, enums, preprocessor, constant, decorator",
    "scope": [
      "keyword.control.xi"
    ]
  },
  {
    "slot": "plainText",
    "name": "heading 6, number",
    "scope": [
      "invalid.xi"
    ]
  },
  {
    "slot": "string",
    "name": "string",
    "scope": [
      "beginning.punctuation.definition.quote.markdown.xi"
    ]
  },
  {
    "slot": "comment",
    "name": "comments",
    "scope": [
      "beginning.punctuation.definition.list.markdown.xi"
    ]
  },
  {
    "slot": "function",
    "name": "link",
    "scope": [
      "constant.character.xi"
    ]
  },
  {
    "slot": "function",
    "name": "accent",
    "scope": [
      "accent.xi"
    ]
  },
  {
    "slot": "constant",
    "name": "wikiword",
    "scope": [
      "wikiword.xi"
    ]
  },
  {
    "slot": "plainText",
    "name": "language operators like '+', '-' etc",
    "scope": [
      "constant.other.color.rgb-value.xi"
    ]
  },
  {
    "slot": "comment",
    "name": "elements to dim",
    "scope": [
      "punctuation.definition.tag.xi"
    ]
  },
  {
    "slot": "type",
    "name": "C++/C#",
    "scope": [
      "entity.name.label.cs",
      "entity.name.scope-resolution.function.call",
      "entity.name.scope-resolution.function.definition"
    ]
  },
  {
    "slot": "primaryVar",
    "name": "Markdown underscore-style headers",
    "scope": [
      "markup.heading.setext.1.markdown",
      "markup.heading.setext.2.markdown"
    ]
  },
  {
    "slot": "plainText",
    "name": "meta.brace.square",
    "scope": [
      "meta.brace.square"
    ]
  },
  {
    "slot": "comment",
    "name": "Comments",
    "scope": "comment, punctuation.definition.comment",
    "fontStyle": "italic"
  },
  {
    "slot": "comment",
    "name": "[VSCODE-CUSTOM] Markdown Quote",
    "scope": "markup.quote.markdown"
  },
  {
    "slot": "plainText",
    "name": "punctuation.definition.block.sequence.item.yaml",
    "scope": "punctuation.definition.block.sequence.item.yaml"
  },
  {
    "slot": "operator",
    "scope": [
      "constant.language.symbol.elixir"
    ]
  },
  {
    "slot": "fontStyleOnly",
    "name": "js/ts italic",
    "scope": "entity.other.attribute-name.js,entity.other.attribute-name.ts,entity.other.attribute-name.jsx,entity.other.attribute-name.tsx,variable.parameter,variable.language.super",
    "fontStyle": "italic"
  },
  {
    "slot": "fontStyleOnly",
    "name": "comment",
    "scope": "comment.line.double-slash,comment.block.documentation",
    "fontStyle": "italic"
  },
  {
    "slot": "fontStyleOnly",
    "name": "Python Keyword Control",
    "scope": "keyword.control.import.python,keyword.control.flow.python",
    "fontStyle": "italic"
  },
  {
    "slot": "fontStyleOnly",
    "name": "markup.italic.markdown",
    "scope": "markup.italic.markdown",
    "fontStyle": "italic"
  }
];
const BASE_UI_COLORS = {
  "foreground": "#ffffff",
  "focusBorder": "#ee4cfc",
  "selection.background": "#e64471",
  "scrollbar.shadow": "#ff161600",
  "activityBar.foreground": "#f5a349",
  "activityBar.background": "#150b01",
  "activityBar.inactiveForeground": "#f5a34962",
  "activityBarBadge.foreground": "#000000",
  "activityBarBadge.background": "#fc6f4c",
  "activityBar.border": "#f5a34966",
  "activityBar.activeBackground": "#00000000",
  "sideBar.background": "#0f0011",
  "sideBar.foreground": "#ffffff",
  "sideBarSectionHeader.background": "#ee4cfc1c",
  "sideBarSectionHeader.foreground": "#ffffff",
  "sideBarSectionHeader.border": "#ee4cfc",
  "sideBarTitle.foreground": "#f5a349",
  "sideBar.border": "#ee4cfc76",
  "list.inactiveSelectionBackground": "#8e4af52e",
  "list.inactiveSelectionForeground": "#ffffff",
  "list.hoverBackground": "#8e4af514",
  "list.hoverForeground": "#ffffff",
  "list.activeSelectionBackground": "#8e4af566",
  "list.activeSelectionForeground": "#ffffff",
  "tree.indentGuidesStroke": "#8e4af57a",
  "list.dropBackground": "#e6447140",
  "list.highlightForeground": "#ff2863",
  "list.focusBackground": "#8e4af566",
  "list.focusForeground": "#ffffff",
  "listFilterWidget.background": "#000000",
  "listFilterWidget.outline": "#ee4cfc",
  "listFilterWidget.noMatchesOutline": "#e64471",
  "statusBar.foreground": "#c09bf9",
  "statusBar.background": "#11002c",
  "statusBarItem.hoverBackground": "#2b026b00",
  "statusBar.border": "#8e4af5",
  "statusBar.debuggingBackground": "#28020c",
  "statusBar.debuggingForeground": "#ff82a5",
  "statusBar.debuggingBorder": "#e64471",
  "statusBar.noFolderBackground": "#011f1c",
  "statusBar.noFolderForeground": "#45ffed",
  "statusBar.noFolderBorder": "#04d9c4",
  "statusBarItem.remoteBackground": "#062802",
  "statusBarItem.remoteForeground": "#00ff85",
  "titleBar.activeBackground": "#000000",
  "titleBar.activeForeground": "#cccccc",
  "titleBar.inactiveBackground": "#000000",
  "titleBar.inactiveForeground": "#cccccc99",
  "titleBar.border": "#f5a34900",
  "menubar.selectionForeground": "#cccccc",
  "menubar.selectionBackground": "#8e4af5",
  "menu.foreground": "#cccccc",
  "menu.background": "#190e2a",
  "menu.selectionForeground": "#ffffff",
  "menu.selectionBackground": "#8e4af5",
  "menu.selectionBorder": "#8e4af5",
  "menu.separatorBackground": "#8e4af58b",
  "menu.border": "#8e4af5",
  "button.background": "#fc6f4c",
  "button.foreground": "#000000",
  "button.hoverBackground": "#fc6f4c",
  "button.secondaryForeground": "#000000",
  "button.secondaryBackground": "#f5a349",
  "button.secondaryHoverBackground": "#f5a349",
  "input.background": "#000000",
  "input.border": "#00000000",
  "input.foreground": "#ffffff",
  "inputOption.activeBackground": "#007fd400",
  "inputOption.activeBorder": "#007acc00",
  "inputOption.activeForeground": "#04d9c4",
  "input.placeholderForeground": "#a6a6a6c9",
  "textLink.foreground": "#f5a349",
  "editor.background": "#000000",
  "editor.foreground": "#ffffff",
  "editorLineNumber.foreground": "#858585ab",
  "editorCursor.foreground": "#ffffff",
  "editorCursor.background": "#000000",
  "editor.selectionBackground": "#381e01",
  "editor.inactiveSelectionBackground": "#3f2000ab",
  "editorWhitespace.foreground": "#e3e4e229",
  "editor.selectionHighlightBackground": "#e6447142",
  "editor.selectionHighlightBorder": "#e6447150",
  "editor.findMatchBackground": "#f2229448",
  "editor.findMatchBorder": "#f22294ab",
  "editor.findMatchHighlightBackground": "#f2229448",
  "editor.findMatchHighlightBorder": "#ffffff00",
  "editor.findRangeHighlightBackground": "#3f2000ab",
  "editor.findRangeHighlightBorder": "#582e03ab",
  "editor.rangeHighlightBackground": "#ffffff0b",
  "editor.rangeHighlightBorder": "#ffffff00",
  "editor.hoverHighlightBackground": "#8e48006c",
  "editor.wordHighlightStrongBackground": "#00497200",
  "editor.wordHighlightBackground": "#57575700",
  "editor.lineHighlightBackground": "#ffffff12",
  "editor.lineHighlightBorder": "#28282842",
  "editorLineNumber.activeForeground": "#04d9c4",
  "editorLink.activeForeground": "#5588ff",
  "editorIndentGuide.background": "#404040",
  "editorIndentGuide.activeBackground": "#707070",
  "editorRuler.foreground": "#ffd11b4e",
  "editorBracketMatch.background": "#301900",
  "editorBracketMatch.border": "#db7914c9",
  "editor.foldBackground": "#24394d5e",
  "editorOverviewRuler.background": "#25252500",
  "editorOverviewRuler.border": "#7f7f7f4d",
  "editorError.foreground": "#ff1c5b",
  "editorError.background": "#B73A3400",
  "editorError.border": "#ffffff00",
  "editorWarning.foreground": "#ffd11b",
  "editorWarning.background": "#a9904000",
  "editorWarning.border": "#ffd11b00",
  "editorInfo.foreground": "#04d9c4",
  "editorInfo.background": "#04d9c41a",
  "editorInfo.border": "#04d9c47a",
  "editorGutter.background": "#00171500",
  "editorGutter.modifiedBackground": "#1ac1f0",
  "editorGutter.addedBackground": "#a6e422",
  "editorGutter.deletedBackground": "#fd4048",
  "editorGutter.foldingControlForeground": "#c5c5c5",
  "editorCodeLens.foreground": "#999999",
  "editorGroup.border": "#04d9c481",
  "diffEditor.insertedTextBackground": "#9bb95533",
  "diffEditor.removedTextBackground": "#ff000033",
  "diffEditor.border": "#444444",
  "panel.background": "#150c02",
  "panel.border": "#f5a34970",
  "panelTitle.activeBorder": "#f5a349",
  "panelTitle.activeForeground": "#f5a349",
  "panelTitle.inactiveForeground": "#e7e7e799",
  "badge.background": "#fc6f4c",
  "badge.foreground": "#000000",
  "terminal.foreground": "#cccccc",
  "terminal.selectionBackground": "#f5a3491e",
  "terminalCursor.background": "#0087FF",
  "terminalCursor.foreground": "#ffffff",
  "terminal.border": "#f5a3497a",
  "terminal.ansiBlack": "#000000",
  "terminal.ansiBlue": "#8968ff",
  "terminal.ansiBrightBlack": "#666666",
  "terminal.ansiBrightBlue": "#a78bff",
  "terminal.ansiBrightCyan": "#45ffed",
  "terminal.ansiBrightGreen": "#a6e422",
  "terminal.ansiBrightMagenta": "#f942ff",
  "terminal.ansiBrightRed": "#ff487b",
  "terminal.ansiBrightWhite": "#ffffff",
  "terminal.ansiBrightYellow": "#ffdf7e",
  "terminal.ansiCyan": "#04d9c4",
  "terminal.ansiGreen": "#73c991",
  "terminal.ansiMagenta": "#ee4cfc",
  "terminal.ansiRed": "#e64471",
  "terminal.ansiWhite": "#e5e5e5",
  "terminal.ansiYellow": "#ffd11b",
  "breadcrumb.background": "#04d9c418",
  "breadcrumb.foreground": "#cccccccc",
  "breadcrumb.focusForeground": "#e0e0e0",
  "editorGroupHeader.border": "#04d9c47a",
  "editorGroupHeader.tabsBackground": "#000000",
  "editorGroupHeader.tabsBorder": "#04d9c47a",
  "tab.activeForeground": "#ffffff",
  "tab.border": "#343434",
  "tab.activeBackground": "#261401cb",
  "tab.activeBorder": "#f5a349",
  "tab.activeBorderTop": "#00000000",
  "tab.inactiveBackground": "#2d2d2d00",
  "tab.inactiveForeground": "#ffffff80",
  "scrollbarSlider.background": "#79797966",
  "scrollbarSlider.hoverBackground": "#646464b3",
  "scrollbarSlider.activeBackground": "#bfbfbf66",
  "progressBar.background": "#e64471",
  "widget.shadow": "#0000005c",
  "editorWidget.foreground": "#cccccc",
  "editorWidget.background": "#300136",
  "editorWidget.resizeBorder": "#ee4cfc",
  "pickerGroup.border": "#ee4cfc",
  "pickerGroup.foreground": "#f5a349",
  "debugToolBar.background": "#1f0212",
  "debugToolBar.border": "#f2229489",
  "notifications.foreground": "#cccccc",
  "notifications.background": "#252526",
  "notificationToast.border": "#474747",
  "notificationsErrorIcon.foreground": "#ff1c5b",
  "notificationsWarningIcon.foreground": "#ffd11b",
  "notificationsInfoIcon.foreground": "#04d9c4",
  "notificationCenter.border": "#8e4af57a",
  "notificationCenterHeader.foreground": "#cccccc",
  "notificationCenterHeader.background": "#190e2a",
  "notifications.border": "#303031",
  "gitDecoration.addedResourceForeground": "#a6e422",
  "gitDecoration.conflictingResourceForeground": "#ee4cfc",
  "gitDecoration.deletedResourceForeground": "#ff1c5b",
  "gitDecoration.ignoredResourceForeground": "#8c8c8c",
  "gitDecoration.modifiedResourceForeground": "#ffd11b",
  "gitDecoration.stageDeletedResourceForeground": "#ff1c5b",
  "gitDecoration.stageModifiedResourceForeground": "#ffd11b",
  "gitDecoration.submoduleResourceForeground": "#04d9c4",
  "gitDecoration.untrackedResourceForeground": "#04d9c4",
  "editorMarkerNavigation.background": "#2c000c",
  "editorMarkerNavigationError.background": "#e64471",
  "editorMarkerNavigationWarning.background": "#f5a349",
  "editorMarkerNavigationInfo.background": "#04d9c4",
  "merge.currentHeaderBackground": "#04d9c44d",
  "merge.currentContentBackground": "#04d9c41a",
  "merge.incomingHeaderBackground": "#8968ff4d",
  "merge.incomingContentBackground": "#8968ff1a",
  "merge.commonHeaderBackground": "#f5a3494d",
  "merge.commonContentBackground": "#f5a3491a",
  "editorSuggestWidget.background": "#1b0008",
  "editorSuggestWidget.border": "#e6447187",
  "editorSuggestWidget.foreground": "#f2efef",
  "editorSuggestWidget.highlightForeground": "#e64471",
  "editorSuggestWidget.selectedBackground": "#410314",
  "editorHoverWidget.foreground": "#eae1e1",
  "editorHoverWidget.background": "#011d1a",
  "editorHoverWidget.border": "#04d9c47a",
  "peekView.border": "#04d9c47a",
  "peekViewEditor.background": "#011d1a",
  "peekViewEditorGutter.background": "#001f3300",
  "peekViewEditor.matchHighlightBackground": "#1c0243",
  "peekViewEditor.matchHighlightBorder": "#5823a9",
  "peekViewResult.background": "#340411",
  "peekViewResult.fileForeground": "#ffffff",
  "peekViewResult.lineForeground": "#ffffff",
  "peekViewResult.matchHighlightBackground": "#e64471",
  "peekViewResult.selectionBackground": "#54071c",
  "peekViewResult.selectionForeground": "#ffffff",
  "peekViewTitle.background": "#044b447a",
  "peekViewTitleDescription.foreground": "#ffffffa3",
  "peekViewTitleLabel.foreground": "#ffffff",
  "icon.foreground": "#ffffff",
  "checkbox.background": "#000000",
  "checkbox.foreground": "#ffffff",
  "checkbox.border": "#00000000",
  "dropdown.background": "#000000",
  "dropdown.foreground": "#ffffff",
  "dropdown.border": "#00000000",
  "minimapGutter.addedBackground": "#a6e422",
  "minimapGutter.modifiedBackground": "#1ac1f0",
  "minimapGutter.deletedBackground": "#fd4048",
  "minimap.findMatchHighlight": "#f2229448",
  "minimap.selectionHighlight": "#381e01",
  "minimap.errorHighlight": "#ff1c5b",
  "minimap.warningHighlight": "#ffd11b",
  "minimap.background": "#000000",
  "sideBar.dropBackground": "#e6447140",
  "editorGroup.emptyBackground": "#000000",
  "panelSection.border": "#f5a3497a",
  "statusBarItem.activeBackground": "#FFFFFF25",
  "settings.headerForeground": "#ffffff",
  "settings.focusedRowBackground": "#ffffff07",
  "walkThrough.embeddedEditorBackground": "#00000050",
  "breadcrumb.activeSelectionForeground": "#e0e0e0",
  "editorGutter.commentRangeForeground": "#c5c5c5",
  "debugExceptionWidget.background": "#1f0212",
  "debugExceptionWidget.border": "#f2229489",
  "debugConsole.infoForeground": "#ffffff",
  "debugConsole.warningForeground": "#ffd11b",
  "debugConsole.errorForeground": "#ff1c5b",
  "debugConsole.sourceForeground": "#f942ff",
  "debugConsoleInputIcon.foreground": "#04d9c4",
  "editorBracketHighlight.foreground1": "#ff487b",
  "editorBracketHighlight.foreground2": "#8968ff",
  "editorBracketHighlight.foreground3": "#04d9c4",
  "editorBracketHighlight.foreground4": "#ffdf7e",
  "editorBracketHighlight.foreground5": "#f942ff",
  "editorBracketHighlight.foreground6": "#ff845e",
  "editorBracketHighlight.unexpectedBracket.foreground": "#ff1c5b",
  "editorBracketPairGuide.activeBackground1": "#ff487b80",
  "editorBracketPairGuide.activeBackground2": "#8968ff80",
  "editorBracketPairGuide.activeBackground3": "#04d9c480",
  "editorBracketPairGuide.activeBackground4": "#ffdf7e80",
  "editorBracketPairGuide.activeBackground5": "#f942ff80",
  "editorBracketPairGuide.activeBackground6": "#ff845e80",
  "editorInlayHint.foreground": "#ffffffa0",
  "editorInlayHint.background": "#8e4af51a",
  "editorInlayHint.typeForeground": "#04d9c4a0",
  "editorInlayHint.typeBackground": "#04d9c41a",
  "editorInlayHint.parameterForeground": "#f942ffa0",
  "editorInlayHint.parameterBackground": "#f942ff1a",
  "editorStickyScroll.background": "#0a0012",
  "editorStickyScrollHover.background": "#8e4af51a",
  "commandCenter.foreground": "#cccccc",
  "commandCenter.activeForeground": "#ffffff",
  "commandCenter.background": "#000000",
  "commandCenter.activeBackground": "#8e4af51a",
  "commandCenter.border": "#8e4af57a",
  "keybindingLabel.foreground": "#ffffff",
  "keybindingLabel.background": "#8e4af533",
  "keybindingLabel.border": "#8e4af57a",
  "keybindingLabel.bottomBorder": "#8e4af5aa",
  "editorStickyScroll.border": "#8e4af57a",
  "tab.lastPinnedBorder": "#ee4cfc7a",
  "sash.hoverBorder": "#ee4cfc"
};
const COLOR_MAPS = {
  "red": {
    "#ffffff": "#FFB3D9",
    "#ee4cfc": "#E64471",
    "#e64471": "#E64471",
    "#ff161600": "#ff161600",
    "#f5a349": "#FF487B",
    "#150b01": "#170308",
    "#f5a34962": "#FF487B62",
    "#000000": "#0A0103",
    "#fc6f4c": "#FF845E",
    "#f5a34966": "#FF487B66",
    "#00000000": "#0A010300",
    "#0f0011": "#120205",
    "#ee4cfc1c": "#E644711c",
    "#ee4cfc76": "#E6447176",
    "#8e4af52e": "#B3244F2e",
    "#8e4af514": "#B3244F14",
    "#8e4af566": "#B3244F66",
    "#8e4af57a": "#B3244F7a",
    "#e6447140": "#E6447140",
    "#ff2863": "#ff2863",
    "#c09bf9": "#c09bf9",
    "#11002c": "#1A040B",
    "#2b026b00": "#2b026b00",
    "#8e4af5": "#B3244F",
    "#28020c": "#240510",
    "#ff82a5": "#ff82a5",
    "#011f1c": "#011f1c",
    "#45ffed": "#45ffed",
    "#04d9c4": "#FFB3D9",
    "#062802": "#062802",
    "#00ff85": "#00ff85",
    "#cccccc": "#cccccc",
    "#cccccc99": "#cccccc99",
    "#f5a34900": "#FF487B00",
    "#190e2a": "#170308",
    "#8e4af58b": "#B3244F8b",
    "#007fd400": "#007fd400",
    "#007acc00": "#007acc00",
    "#a6a6a6c9": "#a6a6a6c9",
    "#858585ab": "#858585ab",
    "#381e01": "#4D0E25",
    "#3f2000ab": "#3f2000ab",
    "#e3e4e229": "#e3e4e229",
    "#e6447142": "#E6447142",
    "#e6447150": "#E6447150",
    "#f2229448": "#F2229448",
    "#f22294ab": "#F22294ab",
    "#ffffff00": "#ffffff00",
    "#582e03ab": "#582e03ab",
    "#ffffff0b": "#ffffff0b",
    "#8e48006c": "#8e48006c",
    "#00497200": "#00497200",
    "#57575700": "#57575700",
    "#ffffff12": "#ffffff12",
    "#28282842": "#28282842",
    "#5588ff": "#5588ff",
    "#404040": "#404040",
    "#707070": "#707070",
    "#ffd11b4e": "#FFDF7E4e",
    "#301900": "#3B0A1C",
    "#db7914c9": "#db7914c9",
    "#24394d5e": "#24394d5e",
    "#25252500": "#25252500",
    "#7f7f7f4d": "#7f7f7f4d",
    "#ff1c5b": "#FF1C5B",
    "#B73A3400": "#B73A3400",
    "#ffd11b": "#FFDF7E",
    "#a9904000": "#a9904000",
    "#ffd11b00": "#FFDF7E00",
    "#04d9c41a": "#FFB3D91a",
    "#04d9c47a": "#FFB3D97a",
    "#00171500": "#00171500",
    "#1ac1f0": "#FF487B",
    "#a6e422": "#FF845E",
    "#fd4048": "#FF1C5B",
    "#c5c5c5": "#c5c5c5",
    "#999999": "#999999",
    "#04d9c481": "#FFB3D981",
    "#9bb95533": "#9bb95533",
    "#ff000033": "#ff000033",
    "#444444": "#444444",
    "#150c02": "#120205",
    "#f5a34970": "#FF487B70",
    "#e7e7e799": "#e7e7e799",
    "#f5a3491e": "#FF487B1e",
    "#0087FF": "#0087FF",
    "#f5a3497a": "#FF487B7a",
    "#8968ff": "#FF845E",
    "#666666": "#666666",
    "#a78bff": "#a78bff",
    "#f942ff": "#FF487B",
    "#ff487b": "#E64471",
    "#ffdf7e": "#FFDF7E",
    "#73c991": "#73c991",
    "#e5e5e5": "#e5e5e5",
    "#04d9c418": "#FFB3D918",
    "#cccccccc": "#cccccccc",
    "#e0e0e0": "#e0e0e0",
    "#343434": "#343434",
    "#261401cb": "#261401cb",
    "#2d2d2d00": "#2d2d2d00",
    "#ffffff80": "#ffffff80",
    "#79797966": "#79797966",
    "#646464b3": "#646464b3",
    "#bfbfbf66": "#bfbfbf66",
    "#0000005c": "#0A01035c",
    "#300136": "#240510",
    "#1f0212": "#1A040B",
    "#f2229489": "#F2229489",
    "#252526": "#252526",
    "#474747": "#474747",
    "#303031": "#303031",
    "#8c8c8c": "#8c8c8c",
    "#2c000c": "#240510",
    "#04d9c44d": "#FFB3D94d",
    "#8968ff4d": "#FF845E4d",
    "#8968ff1a": "#FF845E1a",
    "#f5a3494d": "#FF487B4d",
    "#f5a3491a": "#FF487B1a",
    "#1b0008": "#1A040B",
    "#e6447187": "#E6447187",
    "#f2efef": "#f2efef",
    "#410314": "#3B0A1C",
    "#eae1e1": "#eae1e1",
    "#011d1a": "#1C0409",
    "#001f3300": "#001f3300",
    "#1c0243": "#1c0243",
    "#5823a9": "#5823a9",
    "#340411": "#240510",
    "#54071c": "#3B0A1C",
    "#044b447a": "#044b447a",
    "#ffffffa3": "#ffffffa3",
    "#FFFFFF25": "#FFFFFF25",
    "#ffffff07": "#ffffff07",
    "#00000050": "#0A010350",
    "#ff845e": "#F22294",
    "#ff487b80": "#E6447180",
    "#8968ff80": "#FF845E80",
    "#04d9c480": "#FFB3D980",
    "#ffdf7e80": "#FFDF7E80",
    "#f942ff80": "#FF487B80",
    "#ff845e80": "#F2229480",
    "#ffffffa0": "#ffffffa0",
    "#8e4af51a": "#B3244F1a",
    "#04d9c4a0": "#FFB3D9a0",
    "#f942ffa0": "#FF487Ba0",
    "#f942ff1a": "#FF487B1a",
    "#0a0012": "#0A0103",
    "#8e4af533": "#B3244F33",
    "#8e4af5aa": "#B3244Faa",
    "#ee4cfc7a": "#E644717a"
  },
  "pink": {
    "#ffffff": "#FFD9F2",
    "#ee4cfc": "#EE4CFC",
    "#e64471": "#EE4CFC",
    "#ff161600": "#ff161600",
    "#f5a349": "#F22294",
    "#150b01": "#14000F",
    "#f5a34962": "#F2229462",
    "#000000": "#080006",
    "#fc6f4c": "#EE05F2",
    "#f5a34966": "#F2229466",
    "#00000000": "#08000600",
    "#0f0011": "#0F000B",
    "#ee4cfc1c": "#EE4CFC1c",
    "#ee4cfc76": "#EE4CFC76",
    "#8e4af52e": "#D414A82e",
    "#8e4af514": "#D414A814",
    "#8e4af566": "#D414A866",
    "#8e4af57a": "#D414A87a",
    "#e6447140": "#EE4CFC40",
    "#ff2863": "#ff2863",
    "#c09bf9": "#c09bf9",
    "#11002c": "#170012",
    "#2b026b00": "#2b026b00",
    "#8e4af5": "#D414A8",
    "#28020c": "#26001E",
    "#ff82a5": "#ff82a5",
    "#011f1c": "#011f1c",
    "#45ffed": "#45ffed",
    "#04d9c4": "#FFFFFF",
    "#062802": "#062802",
    "#00ff85": "#00ff85",
    "#cccccc": "#cccccc",
    "#cccccc99": "#cccccc99",
    "#f5a34900": "#F2229400",
    "#190e2a": "#14000F",
    "#8e4af58b": "#D414A88b",
    "#007fd400": "#007fd400",
    "#007acc00": "#007acc00",
    "#a6a6a6c9": "#a6a6a6c9",
    "#858585ab": "#858585ab",
    "#381e01": "#590046",
    "#3f2000ab": "#3f2000ab",
    "#e3e4e229": "#e3e4e229",
    "#e6447142": "#EE4CFC42",
    "#e6447150": "#EE4CFC50",
    "#f2229448": "#FFB3D948",
    "#f22294ab": "#FFB3D9ab",
    "#ffffff00": "#ffffff00",
    "#582e03ab": "#582e03ab",
    "#ffffff0b": "#ffffff0b",
    "#8e48006c": "#8e48006c",
    "#00497200": "#00497200",
    "#57575700": "#57575700",
    "#ffffff12": "#ffffff12",
    "#28282842": "#28282842",
    "#5588ff": "#5588ff",
    "#404040": "#404040",
    "#707070": "#707070",
    "#ffd11b4e": "#FFDF7E4e",
    "#301900": "#400032",
    "#db7914c9": "#db7914c9",
    "#24394d5e": "#24394d5e",
    "#25252500": "#25252500",
    "#7f7f7f4d": "#7f7f7f4d",
    "#ff1c5b": "#FF1C5B",
    "#B73A3400": "#B73A3400",
    "#ffd11b": "#FFDF7E",
    "#a9904000": "#a9904000",
    "#ffd11b00": "#FFDF7E00",
    "#04d9c41a": "#FFFFFF1a",
    "#04d9c47a": "#FFFFFF7a",
    "#00171500": "#00171500",
    "#1ac1f0": "#EE05F2",
    "#a6e422": "#8E4AF5",
    "#fd4048": "#FF1C5B",
    "#c5c5c5": "#c5c5c5",
    "#999999": "#999999",
    "#04d9c481": "#FFFFFF81",
    "#9bb95533": "#9bb95533",
    "#ff000033": "#ff000033",
    "#444444": "#444444",
    "#150c02": "#0F000B",
    "#f5a34970": "#F2229470",
    "#e7e7e799": "#e7e7e799",
    "#f5a3491e": "#F222941e",
    "#0087FF": "#0087FF",
    "#f5a3497a": "#F222947a",
    "#8968ff": "#EE05F2",
    "#666666": "#666666",
    "#a78bff": "#a78bff",
    "#f942ff": "#EE4CFC",
    "#ff487b": "#F22294",
    "#ffdf7e": "#FFDF7E",
    "#73c991": "#73c991",
    "#e5e5e5": "#e5e5e5",
    "#04d9c418": "#FFFFFF18",
    "#cccccccc": "#cccccccc",
    "#e0e0e0": "#e0e0e0",
    "#343434": "#343434",
    "#261401cb": "#261401cb",
    "#2d2d2d00": "#2d2d2d00",
    "#ffffff80": "#ffffff80",
    "#79797966": "#79797966",
    "#646464b3": "#646464b3",
    "#bfbfbf66": "#bfbfbf66",
    "#0000005c": "#0800065c",
    "#300136": "#26001E",
    "#1f0212": "#1A0014",
    "#f2229489": "#FFB3D989",
    "#252526": "#252526",
    "#474747": "#474747",
    "#303031": "#303031",
    "#8c8c8c": "#8c8c8c",
    "#2c000c": "#26001E",
    "#04d9c44d": "#FFFFFF4d",
    "#8968ff4d": "#EE05F24d",
    "#8968ff1a": "#EE05F21a",
    "#f5a3494d": "#F222944d",
    "#f5a3491a": "#F222941a",
    "#1b0008": "#1A0014",
    "#e6447187": "#EE4CFC87",
    "#f2efef": "#f2efef",
    "#410314": "#400032",
    "#eae1e1": "#eae1e1",
    "#011d1a": "#1C0016",
    "#001f3300": "#001f3300",
    "#1c0243": "#1c0243",
    "#5823a9": "#5823a9",
    "#340411": "#26001E",
    "#54071c": "#400032",
    "#044b447a": "#044b447a",
    "#ffffffa3": "#ffffffa3",
    "#FFFFFF25": "#FFFFFF25",
    "#ffffff07": "#ffffff07",
    "#00000050": "#08000650",
    "#ff845e": "#8E4AF5",
    "#ff487b80": "#F2229480",
    "#8968ff80": "#EE05F280",
    "#04d9c480": "#FFFFFF80",
    "#ffdf7e80": "#FFDF7E80",
    "#f942ff80": "#EE4CFC80",
    "#ff845e80": "#8E4AF580",
    "#ffffffa0": "#ffffffa0",
    "#8e4af51a": "#D414A81a",
    "#04d9c4a0": "#FFFFFFa0",
    "#f942ffa0": "#EE4CFCa0",
    "#f942ff1a": "#EE4CFC1a",
    "#0a0012": "#080006",
    "#8e4af533": "#D414A833",
    "#8e4af5aa": "#D414A8aa",
    "#ee4cfc7a": "#EE4CFC7a"
  },
  "purple": {
    "#ffffff": "#E6D9FF",
    "#ee4cfc": "#B377FF",
    "#e64471": "#8E4AF5",
    "#ff161600": "#ff161600",
    "#f5a349": "#8E4AF5",
    "#150b01": "#110029",
    "#f5a34962": "#8E4AF562",
    "#000000": "#070012",
    "#fc6f4c": "#D1A3FF",
    "#f5a34966": "#8E4AF566",
    "#00000000": "#07001200",
    "#0f0011": "#0D001F",
    "#ee4cfc1c": "#B377FF1c",
    "#ee4cfc76": "#B377FF76",
    "#8e4af52e": "#8E4AF52e",
    "#8e4af514": "#8E4AF514",
    "#8e4af566": "#8E4AF566",
    "#8e4af57a": "#8E4AF57a",
    "#e6447140": "#8E4AF540",
    "#ff2863": "#ff2863",
    "#c09bf9": "#c09bf9",
    "#11002c": "#140033",
    "#2b026b00": "#2b026b00",
    "#8e4af5": "#8E4AF5",
    "#28020c": "#1C0040",
    "#ff82a5": "#ff82a5",
    "#011f1c": "#011f1c",
    "#45ffed": "#45ffed",
    "#04d9c4": "#04D9C4",
    "#062802": "#062802",
    "#00ff85": "#00ff85",
    "#cccccc": "#cccccc",
    "#cccccc99": "#cccccc99",
    "#f5a34900": "#8E4AF500",
    "#190e2a": "#110029",
    "#8e4af58b": "#8E4AF58b",
    "#007fd400": "#007fd400",
    "#007acc00": "#007acc00",
    "#a6a6a6c9": "#a6a6a6c9",
    "#858585ab": "#858585ab",
    "#381e01": "#42008A",
    "#3f2000ab": "#3f2000ab",
    "#e3e4e229": "#e3e4e229",
    "#e6447142": "#8E4AF542",
    "#e6447150": "#8E4AF550",
    "#f2229448": "#EE4CFC48",
    "#f22294ab": "#EE4CFCab",
    "#ffffff00": "#ffffff00",
    "#582e03ab": "#582e03ab",
    "#ffffff0b": "#ffffff0b",
    "#8e48006c": "#8e48006c",
    "#00497200": "#00497200",
    "#57575700": "#57575700",
    "#ffffff12": "#ffffff12",
    "#28282842": "#28282842",
    "#5588ff": "#5588ff",
    "#404040": "#404040",
    "#707070": "#707070",
    "#ffd11b4e": "#FFDF7E4e",
    "#301900": "#2E0066",
    "#db7914c9": "#db7914c9",
    "#24394d5e": "#24394d5e",
    "#25252500": "#25252500",
    "#7f7f7f4d": "#7f7f7f4d",
    "#ff1c5b": "#FF1C5B",
    "#B73A3400": "#B73A3400",
    "#ffd11b": "#FFDF7E",
    "#a9904000": "#a9904000",
    "#ffd11b00": "#FFDF7E00",
    "#04d9c41a": "#04D9C41a",
    "#04d9c47a": "#04D9C47a",
    "#00171500": "#00171500",
    "#1ac1f0": "#B377FF",
    "#a6e422": "#04D9C4",
    "#fd4048": "#FF1C5B",
    "#c5c5c5": "#c5c5c5",
    "#999999": "#999999",
    "#04d9c481": "#04D9C481",
    "#9bb95533": "#9bb95533",
    "#ff000033": "#ff000033",
    "#444444": "#444444",
    "#150c02": "#0D001F",
    "#f5a34970": "#8E4AF570",
    "#e7e7e799": "#e7e7e799",
    "#f5a3491e": "#8E4AF51e",
    "#0087FF": "#0087FF",
    "#f5a3497a": "#8E4AF57a",
    "#8968ff": "#B377FF",
    "#666666": "#666666",
    "#a78bff": "#a78bff",
    "#f942ff": "#D1A3FF",
    "#ff487b": "#8E4AF5",
    "#ffdf7e": "#EE4CFC",
    "#73c991": "#73c991",
    "#e5e5e5": "#e5e5e5",
    "#04d9c418": "#04D9C418",
    "#cccccccc": "#cccccccc",
    "#e0e0e0": "#e0e0e0",
    "#343434": "#343434",
    "#261401cb": "#261401cb",
    "#2d2d2d00": "#2d2d2d00",
    "#ffffff80": "#ffffff80",
    "#79797966": "#79797966",
    "#646464b3": "#646464b3",
    "#bfbfbf66": "#bfbfbf66",
    "#0000005c": "#0700125c",
    "#300136": "#1C0040",
    "#1f0212": "#160033",
    "#f2229489": "#EE4CFC89",
    "#252526": "#252526",
    "#474747": "#474747",
    "#303031": "#303031",
    "#8c8c8c": "#8c8c8c",
    "#2c000c": "#1C0040",
    "#04d9c44d": "#04D9C44d",
    "#8968ff4d": "#B377FF4d",
    "#8968ff1a": "#B377FF1a",
    "#f5a3494d": "#8E4AF54d",
    "#f5a3491a": "#8E4AF51a",
    "#1b0008": "#160033",
    "#e6447187": "#8E4AF587",
    "#f2efef": "#f2efef",
    "#410314": "#2E0066",
    "#eae1e1": "#eae1e1",
    "#011d1a": "#190038",
    "#001f3300": "#001f3300",
    "#1c0243": "#1c0243",
    "#5823a9": "#5823a9",
    "#340411": "#1C0040",
    "#54071c": "#2E0066",
    "#044b447a": "#044b447a",
    "#ffffffa3": "#ffffffa3",
    "#FFFFFF25": "#FFFFFF25",
    "#ffffff07": "#ffffff07",
    "#00000050": "#07001250",
    "#ff845e": "#FFFFFF",
    "#ff487b80": "#8E4AF580",
    "#8968ff80": "#B377FF80",
    "#04d9c480": "#04D9C480",
    "#ffdf7e80": "#EE4CFC80",
    "#f942ff80": "#D1A3FF80",
    "#ff845e80": "#FFFFFF80",
    "#ffffffa0": "#ffffffa0",
    "#8e4af51a": "#8E4AF51a",
    "#04d9c4a0": "#04D9C4a0",
    "#f942ffa0": "#D1A3FFa0",
    "#f942ff1a": "#D1A3FF1a",
    "#0a0012": "#070012",
    "#8e4af533": "#8E4AF533",
    "#8e4af5aa": "#8E4AF5aa",
    "#ee4cfc7a": "#B377FF7a"
  },
  "green": {
    "#ffffff": "#D4FFF0",
    "#ee4cfc": "#00FF88",
    "#e64471": "#00FF88",
    "#ff161600": "#ff161600",
    "#f5a349": "#00FF88",
    "#150b01": "#010905",
    "#f5a34962": "#00FF8862",
    "#000000": "#010C07",
    "#fc6f4c": "#00E5FF",
    "#f5a34966": "#00FF8866",
    "#00000000": "#010C0700",
    "#0f0011": "#010E09",
    "#ee4cfc1c": "#00FF881c",
    "#ee4cfc76": "#00FF8876",
    "#8e4af52e": "#00B36B2e",
    "#8e4af514": "#00B36B14",
    "#8e4af566": "#00B36B66",
    "#8e4af57a": "#00B36B7a",
    "#e6447140": "#00FF8840",
    "#ff2863": "#ff2863",
    "#c09bf9": "#c09bf9",
    "#11002c": "#01140A",
    "#2b026b00": "#2b026b00",
    "#8e4af5": "#00B36B",
    "#28020c": "#031A10",
    "#ff82a5": "#ff82a5",
    "#011f1c": "#011f1c",
    "#45ffed": "#45ffed",
    "#04d9c4": "#00E5FF",
    "#062802": "#062802",
    "#00ff85": "#00ff85",
    "#cccccc": "#cccccc",
    "#cccccc99": "#cccccc99",
    "#f5a34900": "#00FF8800",
    "#190e2a": "#010905",
    "#8e4af58b": "#00B36B8b",
    "#007fd400": "#007fd400",
    "#007acc00": "#007acc00",
    "#a6a6a6c9": "#a6a6a6c9",
    "#858585ab": "#858585ab",
    "#381e01": "#003D20",
    "#3f2000ab": "#3f2000ab",
    "#e3e4e229": "#e3e4e229",
    "#e6447142": "#00FF8842",
    "#e6447150": "#00FF8850",
    "#f2229448": "#00FF8848",
    "#f22294ab": "#00FF88ab",
    "#ffffff00": "#ffffff00",
    "#582e03ab": "#582e03ab",
    "#ffffff0b": "#ffffff0b",
    "#8e48006c": "#8e48006c",
    "#00497200": "#00497200",
    "#57575700": "#57575700",
    "#ffffff12": "#ffffff12",
    "#28282842": "#28282842",
    "#5588ff": "#5588ff",
    "#404040": "#404040",
    "#707070": "#707070",
    "#ffd11b4e": "#FFDF7E4e",
    "#301900": "#002E18",
    "#db7914c9": "#db7914c9",
    "#24394d5e": "#24394d5e",
    "#25252500": "#25252500",
    "#7f7f7f4d": "#7f7f7f4d",
    "#ff1c5b": "#FF1C5B",
    "#B73A3400": "#B73A3400",
    "#ffd11b": "#FFDF7E",
    "#a9904000": "#a9904000",
    "#ffd11b00": "#FFDF7E00",
    "#04d9c41a": "#00E5FF1a",
    "#04d9c47a": "#00E5FF7a",
    "#00171500": "#00171500",
    "#1ac1f0": "#00E5FF",
    "#a6e422": "#C3FF00",
    "#fd4048": "#FF1C5B",
    "#c5c5c5": "#c5c5c5",
    "#999999": "#999999",
    "#04d9c481": "#00E5FF81",
    "#9bb95533": "#9bb95533",
    "#ff000033": "#ff000033",
    "#444444": "#444444",
    "#150c02": "#010E09",
    "#f5a34970": "#00FF8870",
    "#e7e7e799": "#e7e7e799",
    "#f5a3491e": "#00FF881e",
    "#0087FF": "#0087FF",
    "#f5a3497a": "#00FF887a",
    "#8968ff": "#00E5FF",
    "#666666": "#666666",
    "#a78bff": "#a78bff",
    "#f942ff": "#C3FF00",
    "#ff487b": "#00FF88",
    "#ffdf7e": "#FFDF7E",
    "#73c991": "#73c991",
    "#e5e5e5": "#e5e5e5",
    "#04d9c418": "#00E5FF18",
    "#cccccccc": "#cccccccc",
    "#e0e0e0": "#e0e0e0",
    "#343434": "#343434",
    "#261401cb": "#261401cb",
    "#2d2d2d00": "#2d2d2d00",
    "#ffffff80": "#ffffff80",
    "#79797966": "#79797966",
    "#646464b3": "#646464b3",
    "#bfbfbf66": "#bfbfbf66",
    "#0000005c": "#010C075c",
    "#300136": "#031A10",
    "#1f0212": "#01140A",
    "#f2229489": "#00FF8889",
    "#252526": "#252526",
    "#474747": "#474747",
    "#303031": "#303031",
    "#8c8c8c": "#8c8c8c",
    "#2c000c": "#031A10",
    "#04d9c44d": "#00E5FF4d",
    "#8968ff4d": "#00E5FF4d",
    "#8968ff1a": "#00E5FF1a",
    "#f5a3494d": "#00FF884d",
    "#f5a3491a": "#00FF881a",
    "#1b0008": "#01140A",
    "#e6447187": "#00FF8887",
    "#f2efef": "#f2efef",
    "#410314": "#002E18",
    "#eae1e1": "#eae1e1",
    "#011d1a": "#02140D",
    "#001f3300": "#001f3300",
    "#1c0243": "#1c0243",
    "#5823a9": "#5823a9",
    "#340411": "#031A10",
    "#54071c": "#002E18",
    "#044b447a": "#044b447a",
    "#ffffffa3": "#ffffffa3",
    "#FFFFFF25": "#FFFFFF25",
    "#ffffff07": "#ffffff07",
    "#00000050": "#010C0750",
    "#ff845e": "#FF7A00",
    "#ff487b80": "#00FF8880",
    "#8968ff80": "#00E5FF80",
    "#04d9c480": "#00E5FF80",
    "#ffdf7e80": "#FFDF7E80",
    "#f942ff80": "#C3FF0080",
    "#ff845e80": "#FF7A0080",
    "#ffffffa0": "#ffffffa0",
    "#8e4af51a": "#00B36B1a",
    "#04d9c4a0": "#00E5FFa0",
    "#f942ffa0": "#C3FF00a0",
    "#f942ff1a": "#C3FF001a",
    "#0a0012": "#010C07",
    "#8e4af533": "#00B36B33",
    "#8e4af5aa": "#00B36Baa",
    "#ee4cfc7a": "#00FF887a"
  },
  "amber": {
    "#ffffff": "#FFF3D6",
    "#ee4cfc": "#FFAA33",
    "#e64471": "#FF5436",
    "#ff161600": "#ff161600",
    "#f5a349": "#FFB800",
    "#150b01": "#080501",
    "#f5a34962": "#FFB80062",
    "#000000": "#0A0702",
    "#fc6f4c": "#FF5436",
    "#f5a34966": "#FFB80066",
    "#00000000": "#0A070200",
    "#0f0011": "#0D0903",
    "#ee4cfc1c": "#FFAA331c",
    "#ee4cfc76": "#FFAA3376",
    "#8e4af52e": "#D488002e",
    "#8e4af514": "#D4880014",
    "#8e4af566": "#D4880066",
    "#8e4af57a": "#D488007a",
    "#e6447140": "#FF543640",
    "#ff2863": "#ff2863",
    "#c09bf9": "#c09bf9",
    "#11002c": "#140E04",
    "#2b026b00": "#2b026b00",
    "#8e4af5": "#D48800",
    "#28020c": "#1A1205",
    "#ff82a5": "#ff82a5",
    "#011f1c": "#011f1c",
    "#45ffed": "#45ffed",
    "#04d9c4": "#04D9C4",
    "#062802": "#062802",
    "#00ff85": "#00ff85",
    "#cccccc": "#cccccc",
    "#cccccc99": "#cccccc99",
    "#f5a34900": "#FFB80000",
    "#190e2a": "#080501",
    "#8e4af58b": "#D488008b",
    "#007fd400": "#007fd400",
    "#007acc00": "#007acc00",
    "#a6a6a6c9": "#a6a6a6c9",
    "#858585ab": "#858585ab",
    "#381e01": "#3D2800",
    "#3f2000ab": "#3f2000ab",
    "#e3e4e229": "#e3e4e229",
    "#e6447142": "#FF543642",
    "#e6447150": "#FF543650",
    "#f2229448": "#FF338848",
    "#f22294ab": "#FF3388ab",
    "#ffffff00": "#ffffff00",
    "#582e03ab": "#582e03ab",
    "#ffffff0b": "#ffffff0b",
    "#8e48006c": "#8e48006c",
    "#00497200": "#00497200",
    "#57575700": "#57575700",
    "#ffffff12": "#ffffff12",
    "#28282842": "#28282842",
    "#5588ff": "#5588ff",
    "#404040": "#404040",
    "#707070": "#707070",
    "#ffd11b4e": "#FFEE554e",
    "#301900": "#2E1E00",
    "#db7914c9": "#db7914c9",
    "#24394d5e": "#24394d5e",
    "#25252500": "#25252500",
    "#7f7f7f4d": "#7f7f7f4d",
    "#ff1c5b": "#FF1C5B",
    "#B73A3400": "#B73A3400",
    "#ffd11b": "#FFEE55",
    "#a9904000": "#a9904000",
    "#ffd11b00": "#FFEE5500",
    "#04d9c41a": "#04D9C41a",
    "#04d9c47a": "#04D9C47a",
    "#00171500": "#00171500",
    "#1ac1f0": "#FFAA33",
    "#a6e422": "#FFEE55",
    "#fd4048": "#FF1C5B",
    "#c5c5c5": "#c5c5c5",
    "#999999": "#999999",
    "#04d9c481": "#04D9C481",
    "#9bb95533": "#9bb95533",
    "#ff000033": "#ff000033",
    "#444444": "#444444",
    "#150c02": "#0D0903",
    "#f5a34970": "#FFB80070",
    "#e7e7e799": "#e7e7e799",
    "#f5a3491e": "#FFB8001e",
    "#0087FF": "#0087FF",
    "#f5a3497a": "#FFB8007a",
    "#8968ff": "#FF5436",
    "#666666": "#666666",
    "#a78bff": "#a78bff",
    "#f942ff": "#FFAA33",
    "#ff487b": "#FFB800",
    "#ffdf7e": "#FFEE55",
    "#73c991": "#73c991",
    "#e5e5e5": "#e5e5e5",
    "#04d9c418": "#04D9C418",
    "#cccccccc": "#cccccccc",
    "#e0e0e0": "#e0e0e0",
    "#343434": "#343434",
    "#261401cb": "#261401cb",
    "#2d2d2d00": "#2d2d2d00",
    "#ffffff80": "#ffffff80",
    "#79797966": "#79797966",
    "#646464b3": "#646464b3",
    "#bfbfbf66": "#bfbfbf66",
    "#0000005c": "#0A07025c",
    "#300136": "#1A1205",
    "#1f0212": "#140E04",
    "#f2229489": "#FF338889",
    "#252526": "#252526",
    "#474747": "#474747",
    "#303031": "#303031",
    "#8c8c8c": "#8c8c8c",
    "#2c000c": "#1A1205",
    "#04d9c44d": "#04D9C44d",
    "#8968ff4d": "#FF54364d",
    "#8968ff1a": "#FF54361a",
    "#f5a3494d": "#FFB8004d",
    "#f5a3491a": "#FFB8001a",
    "#1b0008": "#140E04",
    "#e6447187": "#FF543687",
    "#f2efef": "#f2efef",
    "#410314": "#2E1E00",
    "#eae1e1": "#eae1e1",
    "#011d1a": "#120C03",
    "#001f3300": "#001f3300",
    "#1c0243": "#1c0243",
    "#5823a9": "#5823a9",
    "#340411": "#1A1205",
    "#54071c": "#2E1E00",
    "#044b447a": "#044b447a",
    "#ffffffa3": "#ffffffa3",
    "#FFFFFF25": "#FFFFFF25",
    "#ffffff07": "#ffffff07",
    "#00000050": "#0A070250",
    "#ff845e": "#FF3388",
    "#ff487b80": "#FFB80080",
    "#8968ff80": "#FF543680",
    "#04d9c480": "#04D9C480",
    "#ffdf7e80": "#FFEE5580",
    "#f942ff80": "#FFAA3380",
    "#ff845e80": "#FF338880",
    "#ffffffa0": "#ffffffa0",
    "#8e4af51a": "#D488001a",
    "#04d9c4a0": "#04D9C4a0",
    "#f942ffa0": "#FFAA33a0",
    "#f942ff1a": "#FFAA331a",
    "#0a0012": "#0A0702",
    "#8e4af533": "#D4880033",
    "#8e4af5aa": "#D48800aa",
    "#ee4cfc7a": "#FFAA337a"
  }
};

// --- Build Function ---
function buildVariant(variantId) {
  const palette = PALETTES[variantId];
  if (!palette) throw new Error('Unknown variant: ' + variantId);

  // 1. Semantic Token Colors
  const semanticTokenColors = {
    enumMember: { foreground: palette.slots.operator },
    'variable.constant': { foreground: palette.slots.constant },
    'variable.defaultLibrary': { foreground: palette.slots.type }
  };

  // 2. TextMate Token Colors
  const tokenColors = TOKEN_TEMPLATES.map(rule => {
    const res = {};
    if (rule.name) res.name = rule.name;
    if (rule.scope) res.scope = rule.scope;
    res.settings = {};
    if (rule.fontStyle) res.settings.fontStyle = rule.fontStyle;
    if (rule.slot && rule.slot !== 'fontStyleOnly') {
      res.settings.foreground = palette.slots[rule.slot];
    }
    return res;
  });

  // 3. Workbench UI Colors
  const colors = {};
  const map = COLOR_MAPS[variantId] || {};

  for (const [key, baseVal] of Object.entries(BASE_UI_COLORS)) {
    colors[key] = (variantId === 'neon') ? baseVal : (map[baseVal] || baseVal);
  }

  // Override bracket highlight & pair guides per palette
  for (let i = 1; i <= 6; i++) {
    colors['editorBracketHighlight.foreground' + i] = palette.brackets[i - 1];
    colors['editorBracketPairGuide.activeBackground' + i] = withAlpha(palette.brackets[i - 1], '80');
  }

  // Apply Semantic Neon ANSI terminal colors
  const ansi = getSemanticAnsi(palette.bg);
  Object.assign(colors, ansi);

  // Apply modern layout surfaces
  const modern = getModernSurfaces(palette);
  Object.assign(colors, modern);

  return {
    name: palette.name,
    type: 'dark',
    semanticHighlighting: true,
    semanticTokenColors,
    tokenColors,
    colors
  };
}

// --- Verification & Contrast Audit ---
function verifyThemes() {
  console.log('\n=== WCAG 2.1 AA Contrast Verification ===');
  let hasFailure = false;
  const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

  for (const [variantId, palette] of Object.entries(PALETTES)) {
    const bg = palette.bg;
    console.log(`\n--- Variant: ${palette.name} (Background: ${bg}) ---`);
    const slots = palette.slots;

    for (const [slotName, hex] of Object.entries(slots)) {
      const cr = getContrast(hex, bg);
      // All syntax tokens must strictly achieve >= 4.5:1 (WCAG 2.1 AA)
      const pass = (cr >= 4.5);
      const flag = pass ? '[PASS]' : '[FAIL]';
      if (!pass) hasFailure = true;
      console.log(`  ${flag} ${slotName.padEnd(12)} ${hex.padEnd(10)} contrast: ${cr.toFixed(2)}:1 ${pass ? '' : '(< 4.5:1 WCAG AA requirement)'}`);
    }

    // Verify ANSI Semantic Integrity
    const ansi = getSemanticAnsi(bg);
    if (!ansi['terminal.ansiRed'].includes('e64471') && !ansi['terminal.ansiRed'].includes('ff1c5b')) {
      console.error(`  [FAIL] ${variantId} terminal.ansiRed semantic signal compromised!`);
      hasFailure = true;
    }

    // Verify Hex Syntax Validity for all generated colors
    const themeObj = buildVariant(variantId);
    for (const [k, v] of Object.entries(themeObj.colors)) {
      if (typeof v === 'string' && v.startsWith('#') && !hexRegex.test(v)) {
        console.error(`  [FAIL] ${variantId} malformed hex color in colors['${k}']: '${v}' (length: ${v.length})`);
        hasFailure = true;
      }
    }
    for (const rule of themeObj.tokenColors) {
      if (rule.settings && rule.settings.foreground && rule.settings.foreground.startsWith('#')) {
        if (!hexRegex.test(rule.settings.foreground)) {
          console.error(`  [FAIL] ${variantId} malformed hex color in token rule '${rule.name}': '${rule.settings.foreground}'`);
          hasFailure = true;
        }
      }
    }
    for (const [k, v] of Object.entries(themeObj.semanticTokenColors)) {
      if (v.foreground && v.foreground.startsWith('#') && !hexRegex.test(v.foreground)) {
        console.error(`  [FAIL] ${variantId} malformed hex color in semanticTokenColors['${k}']: '${v.foreground}'`);
        hasFailure = true;
      }
    }
  }

  if (hasFailure) {
    throw new Error('Verification failed: contrast or color syntax check failed.');
  }
  console.log('\nAll tokens verified: WCAG 2.1 AA, valid hex syntax, and ANSI semantic integrity satisfied.');
}

// --- Main Build Execution ---
function main() {
  console.log('[neon-shimmer] Building theme variants...');

  const rootDir = path.resolve(__dirname, '..');
  const themesDir = path.join(rootDir, 'themes');
  if (!fs.existsSync(themesDir)) {
    fs.mkdirSync(themesDir, { recursive: true });
  }

  for (const variantId of Object.keys(PALETTES)) {
    const themeObj = buildVariant(variantId);
    const targetPath = path.join(rootDir, PALETTES[variantId].filename);
    fs.writeFileSync(targetPath, JSON.stringify(themeObj, null, 2) + '\n', 'utf8');
    console.log(`  Generated ${PALETTES[variantId].filename} (${Object.keys(themeObj.colors).length} UI colors, ${themeObj.tokenColors.length} token rules)`);
  }

  verifyThemes();
  console.log('\n[neon-shimmer] Build complete: all variants generated deterministically.\n');
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error('[neon-shimmer] Build error:', err);
    process.exit(1);
  }
}

module.exports = {
  buildVariant,
  verifyThemes,
  getContrast,
  hexToRgb,
  blend,
  relLuminance,
  withAlpha,
  getSemanticAnsi,
  getModernSurfaces,
  PALETTES,
  TOKEN_TEMPLATES,
  BASE_UI_COLORS,
  COLOR_MAPS
};
