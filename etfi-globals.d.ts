// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: etfi-globals.d.ts
//
// Author: Zatygold
//
// Editor-only type declarations. The game never loads this file — it exists so
// `checkJs` in jsconfig.json does not flag the engine globals the host injects
// into every UI script as undefined.
//
// These are deliberately LOOSE (`any` on the leaves). Civilization VII ships
// compiled .js with source maps pointing at .ts sources that are not shipped,
// so there are no official type definitions to import. Writing speculative
// precise types here would invent a contract the engine has not promised and
// would produce confident-looking errors that are really just guesses. The
// value of this file is catching typos in the mod's OWN code — undeclared
// variables, misspelled locals, bad call arity — not validating engine calls.
//
// If Firaxis ever ships .d.ts files, delete this and reference those instead.

// --- injected globals -------------------------------------------------------

declare const GameInfo: any;
declare const GameplayMap: any;
declare const Locale: any;
declare const engine: any;
declare const Players: any;
declare const Cities: any;
declare const Districts: any;
declare const Constructibles: any;
declare const MapConstructibles: any;
declare const UI: any;
declare const Game: any;
declare const GameContext: any;
declare const Controls: any;
declare const Configuration: any;

// Enum-like globals. Each is guarded with `typeof X !== "undefined"` at the
// call sites, because they are age- or context-dependent.
declare const GrowthTypes: any;
declare const ProjectTypes: any;
declare const YieldTypes: any;
declare const UniqueQuarterTypes: any;
declare const ProgressionTreeNodeState: any;

// The engine's UI component base class. It is a global, not an import — the
// game's own components do `class Foo extends Component` with no import line.
declare class Component {
  Root: HTMLElement;
  constructor(root?: any);
  onInitialize(): void;
  onAttach(): void;
  onDetach(): void;
  onAttributeChanged(name: string, oldValue: string, newValue: string): void;
  [key: string]: any;
}

// --- DOM expandos -----------------------------------------------------------

// The engine attaches its component instance to the host element and lets
// components hang their own state off DOM nodes. Declaring the expandos the mod
// touches keeps real mistakes visible instead of buried in known-noise errors.
interface Element {
  component?: any;
  maybeComponent?: any;
}
interface HTMLElement {
  etfiDescription?: any;
}

// --- engine module paths ----------------------------------------------------

// The engine serves its modules from absolute paths at runtime. These are
// declared as wildcard ambient modules rather than mapped to the game's install
// directory on purpose:
//
//   * the mod stays checkable on any machine, with no path to keep in sync;
//   * the game's own compiled .js is never pulled into the program, so its
//     thousands of files are not type-checked and do not bury the mod's own
//     diagnostics in noise from code we neither own nor may modify.
//
// The cost is that imported engine symbols are `any`. That is what they would
// have been anyway — the game ships no type definitions.
declare module "/core/*";
declare module "/base-standard/*";
