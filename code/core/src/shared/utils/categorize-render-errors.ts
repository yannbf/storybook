import {
  isI18nPackage,
  isRouterPackage,
  isStateManagementPackage,
  isStylingPackage,
} from './ecosystem-identifier';

export const ERROR_CATEGORIES = {
  MISSING_PROVIDER: 'MISSING_PROVIDER',
  MISSING_STATE_PROVIDER: 'MISSING_STATE_PROVIDER',
  MISSING_ROUTER_PROVIDER: 'MISSING_ROUTER_PROVIDER',
  MISSING_THEME_PROVIDER: 'MISSING_THEME_PROVIDER',
  MISSING_TRANSLATION_PROVIDER: 'MISSING_TRANSLATION_PROVIDER',
  MISSING_PORTAL_ROOT: 'MISSING_PORTAL_ROOT',
  HOOK_USAGE_ERROR: 'HOOK_USAGE_ERROR',
  MODULE_IMPORT_ERROR: 'MODULE_IMPORT_ERROR',
  COMPONENT_RENDER_ERROR: 'COMPONENT_RENDER_ERROR',
  SERVER_COMPONENTS_ERROR: 'SERVER_COMPONENTS_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  // Vite related errors
  DYNAMIC_MODULE_IMPORT_ERROR: 'DYNAMIC_MODULE_IMPORT_ERROR',
  // Vitest test run related errors
  TEST_FILE_IMPORT_ERROR: 'TEST_FILE_IMPORT_ERROR',
} as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[keyof typeof ERROR_CATEGORIES];

export interface ErrorContext {
  message: string;
  stack?: string;

  normalizedMessage: string;
  normalizedStack: string;

  stackDeps: Set<string>;
}

interface CategorizationRule {
  category: ErrorCategory;
  priority: number;
  match: (ctx: ErrorContext) => boolean;
}

// From a message and stack, return a context for each category matchers
function buildErrorContext(message: string, stack?: string): ErrorContext {
  const normalizedMessage = message.toLowerCase();
  const normalizedStack = (stack ?? '').toLowerCase();

  const stackDeps = new Set<string>();
  const stackLines = normalizedStack.split('\n').filter(Boolean);

  for (const line of stackLines) {
    // Extracts any module name between '/deps/' and '.js'
    // e.g. http://localhost:63315/node_modules/.cache/storybook/490ab5/sb-vitest/deps/@emotion/react.js:500:10
    // would become '@emotion/react'
    // NOTE this is Vite dependent for now.
    const depMatch = line.match(/\/deps\/([^:]+)\.js/);
    if (depMatch) {
      stackDeps.add(depMatch[1]);
    }
  }

  return {
    message,
    stack,
    normalizedMessage,
    normalizedStack,
    stackDeps,
  };
}

/**
 * Each rule is a category matcher with a priority. The higher the priority, the more specific the
 * rule is. For instance you might have an error message that matches two categories
 *
 * E.g. "cannot find module theme".
 *
 * In this case, it's more of a module import error than a theme provider error.
 *
 * Each matcher combines doing simple checks based on error message but also fallback to checking
 * existence of specific dependency names in the stack, as sometimes an error message isn't enough.
 *
 * E.g. "Cannot read properties of undefined (reading 'theme')" at /deps/styled-components.js
 */
const CATEGORIZATION_RULES: CategorizationRule[] = [
  {
    category: ERROR_CATEGORIES.MODULE_IMPORT_ERROR,
    priority: 100,
    match: (ctx) =>
      ctx.normalizedMessage.includes('cannot find module') ||
      ctx.normalizedMessage.includes('module not found') ||
      ctx.normalizedMessage.includes('cannot resolve module'),
  },

  {
    category: ERROR_CATEGORIES.TEST_FILE_IMPORT_ERROR,
    priority: 95,
    match: (ctx) => ctx.normalizedMessage.includes('failed to import test file'),
  },

  {
    category: ERROR_CATEGORIES.DYNAMIC_MODULE_IMPORT_ERROR,
    priority: 95,
    match: (ctx) => ctx.normalizedMessage.includes('failed to fetch dynamically imported module'),
  },

  {
    category: ERROR_CATEGORIES.HOOK_USAGE_ERROR,
    priority: 90,
    match: (ctx) =>
      ctx.normalizedMessage.includes('invalid hook call') ||
      ctx.normalizedMessage.includes('rendered more hooks than') ||
      ctx.normalizedMessage.includes('hooks can only be called'),
  },

  {
    category: ERROR_CATEGORIES.MISSING_STATE_PROVIDER,
    priority: 85,
    match: (ctx) =>
      Array.from(ctx.stackDeps).some(isStateManagementPackage) &&
      (ctx.normalizedMessage.includes('context') ||
        ctx.normalizedMessage.includes('undefined') ||
        ctx.normalizedMessage.includes('null')),
  },

  {
    category: ERROR_CATEGORIES.MISSING_ROUTER_PROVIDER,
    priority: 85,
    match: (ctx) =>
      Array.from(ctx.stackDeps).some(isRouterPackage) ||
      ctx.normalizedMessage.includes('usenavigate') ||
      ctx.normalizedMessage.includes('router'),
  },

  {
    category: ERROR_CATEGORIES.SERVER_COMPONENTS_ERROR,
    priority: 85,
    match: (ctx) =>
      ctx.normalizedMessage.includes('server components') ||
      ctx.normalizedMessage.includes('use client') ||
      (ctx.normalizedMessage.includes('async/await') &&
        ctx.normalizedMessage.includes('not supported')),
  },

  {
    category: ERROR_CATEGORIES.MISSING_THEME_PROVIDER,
    priority: 80,
    match: (ctx) =>
      (Array.from(ctx.stackDeps).some(isStylingPackage) &&
        (ctx.normalizedMessage.includes('theme') || ctx.normalizedMessage.includes('undefined'))) ||
      ctx.normalizedMessage.includes('usetheme') ||
      (ctx.normalizedMessage.includes('theme') && ctx.normalizedMessage.includes('provider')),
  },

  {
    category: ERROR_CATEGORIES.MISSING_TRANSLATION_PROVIDER,
    priority: 80,
    match: (ctx) =>
      Array.from(ctx.stackDeps).some(isI18nPackage) ||
      ctx.normalizedMessage.includes('i18n') ||
      ctx.normalizedMessage.includes('translation') ||
      ctx.normalizedMessage.includes('locale'),
  },

  {
    category: ERROR_CATEGORIES.MISSING_PORTAL_ROOT,
    priority: 70,
    match: (ctx) =>
      ctx.normalizedMessage.includes('portal') &&
      (ctx.normalizedMessage.includes('container') || ctx.normalizedMessage.includes('root')) &&
      (ctx.normalizedMessage.includes('null') || ctx.normalizedMessage.includes('not found')),
  },

  {
    category: ERROR_CATEGORIES.MISSING_PROVIDER,
    priority: 60,
    match: (ctx) =>
      (ctx.normalizedMessage.includes('use') && ctx.normalizedMessage.includes('provider')) ||
      ctx.normalizedMessage.includes('<provider>') ||
      ((ctx.normalizedMessage.includes('could not find') ||
        ctx.normalizedMessage.includes('missing')) &&
        ctx.normalizedMessage.includes('context')) ||
      (ctx.normalizedMessage.includes('usecontext') &&
        (ctx.normalizedMessage.includes('null') || ctx.normalizedMessage.includes('undefined'))),
  },

  {
    category: ERROR_CATEGORIES.COMPONENT_RENDER_ERROR,
    priority: 10,
    match: (ctx) =>
      ctx.normalizedMessage.includes('cannot read') ||
      ctx.normalizedMessage.includes('undefined is not a function') ||
      ctx.normalizedMessage.includes('render'),
  },
];

const RULES = CATEGORIZATION_RULES.sort((a, b) => b.priority - a.priority);

/**
 * For a given error, return which category and which whitelisted dependencies of that category were
 * matched in the stack trace
 */
export function categorizeError(
  message: string,
  stack?: string
): { category: ErrorCategory; matchedDependencies: string[] } {
  const ctx = buildErrorContext(message, stack);
  const rule = RULES.find((r) => r.match(ctx));

  if (!rule) {
    return { category: ERROR_CATEGORIES.UNKNOWN_ERROR, matchedDependencies: [] };
  }

  // Extract matched dependencies based on the category
  const matchedDependencies = getMatchedDependencies(rule.category, ctx);
  return { category: rule.category, matchedDependencies };
}

function getMatchedDependencies(category: ErrorCategory, ctx: ErrorContext): string[] {
  switch (category) {
    case ERROR_CATEGORIES.MISSING_STATE_PROVIDER:
      return Array.from(ctx.stackDeps).filter(isStateManagementPackage);
    case ERROR_CATEGORIES.MISSING_ROUTER_PROVIDER:
      return Array.from(ctx.stackDeps).filter(isRouterPackage);
    case ERROR_CATEGORIES.MISSING_THEME_PROVIDER:
      return Array.from(ctx.stackDeps).filter(isStylingPackage);
    case ERROR_CATEGORIES.MISSING_TRANSLATION_PROVIDER:
      return Array.from(ctx.stackDeps).filter(isI18nPackage);
    default:
      return [];
  }
}

/** For a given category, return actionable guidance items to help resolve the error. */
export function getCategoryGuidanceItems(category: ErrorCategory): string[] {
  switch (category) {
    case ERROR_CATEGORIES.MISSING_STATE_PROVIDER:
    case ERROR_CATEGORIES.MISSING_ROUTER_PROVIDER:
    case ERROR_CATEGORIES.MISSING_THEME_PROVIDER:
    case ERROR_CATEGORIES.MISSING_TRANSLATION_PROVIDER:
    case ERROR_CATEGORIES.MISSING_PROVIDER:
      return [
        'Wrap your component with the required provider using a <a href="https://storybook.js.org/docs/writing-stories/decorators">decorator</a>.',
        'Check if your project has a global decorator in <code>.storybook/preview.js</code> that supplies this context.',
      ];

    case ERROR_CATEGORIES.HOOK_USAGE_ERROR:
      return [
        'Ensure React hooks are only called inside function components or custom hooks.',
        'Check for conditional hook calls or hooks called in loops.',
        'See the <a href="https://react.dev/warnings/invalid-hook-call-warning">React hooks rules</a> for more details.',
      ];

    case ERROR_CATEGORIES.MODULE_IMPORT_ERROR:
      return [
        'Verify the module path is correct and the package is installed.',
        'Check your <a href="https://storybook.js.org/docs/builders/webpack">Webpack</a> or <a href="https://storybook.js.org/docs/builders/vite">Vite</a> configuration for missing aliases or loaders.',
      ];

    case ERROR_CATEGORIES.SERVER_COMPONENTS_ERROR:
      return [
        'Storybook renders components in the browser — Server Components are not supported in the canvas.',
        'Add a <code>"use client"</code> directive or create a client wrapper for your story.',
      ];

    case ERROR_CATEGORIES.DYNAMIC_MODULE_IMPORT_ERROR:
      return [
        'Try reloading the page, as this can be caused by a stale module cache.',
        'Check your Vite configuration for any dynamic import issues.',
      ];

    case ERROR_CATEGORIES.MISSING_PORTAL_ROOT:
      return [
        'Ensure a valid DOM element exists for portal rendering.',
        'Use a decorator to provide the portal container element.',
      ];

    case ERROR_CATEGORIES.TEST_FILE_IMPORT_ERROR:
      return [
        'Verify your test setup file exists and is correctly configured.',
        'Check for syntax errors or missing imports in the test file.',
      ];

    case ERROR_CATEGORIES.COMPONENT_RENDER_ERROR:
      return [
        'Check for <code>null</code> or <code>undefined</code> values being accessed in your component.',
        'Review the stack trace below to locate the exact render failure.',
      ];

    default:
      return [
        '<strong>Missing Context/Providers:</strong> Use <a href="https://storybook.js.org/docs/writing-stories/decorators">decorators</a> to supply specific contexts or providers.',
        '<strong>Misconfigured Webpack or Vite:</strong> Verify your <a href="https://storybook.js.org/docs/builders/webpack">Webpack</a> or <a href="https://storybook.js.org/docs/builders/vite">Vite</a> settings.',
        '<strong>Missing Environment Variables:</strong> Set up <a href="https://storybook.js.org/docs/configure/environment-variables">environment variables</a> as needed.',
      ];
  }
}

/** For a given category, return a documentation URL for further reading, or null if none. */
export function getCategoryDocsLink(category: ErrorCategory): string | null {
  switch (category) {
    case ERROR_CATEGORIES.MISSING_STATE_PROVIDER:
    case ERROR_CATEGORIES.MISSING_ROUTER_PROVIDER:
    case ERROR_CATEGORIES.MISSING_THEME_PROVIDER:
    case ERROR_CATEGORIES.MISSING_TRANSLATION_PROVIDER:
    case ERROR_CATEGORIES.MISSING_PROVIDER:
      return 'https://storybook.js.org/docs/writing-stories/decorators';

    case ERROR_CATEGORIES.HOOK_USAGE_ERROR:
      return 'https://react.dev/warnings/invalid-hook-call-warning';

    case ERROR_CATEGORIES.MODULE_IMPORT_ERROR:
      return 'https://storybook.js.org/docs/builders/webpack';

    case ERROR_CATEGORIES.SERVER_COMPONENTS_ERROR:
      return 'https://storybook.js.org/docs/get-started/frameworks/nextjs';

    default:
      return null;
  }
}

/** For a given category, return a description of the error for better legibility. */
export function getCategoryDescription(category: ErrorCategory): string {
  switch (category) {
    case ERROR_CATEGORIES.MISSING_STATE_PROVIDER:
      return 'Component attempted to access shared state without a state management provider';

    case ERROR_CATEGORIES.MISSING_ROUTER_PROVIDER:
      return 'Component attempted to access routing context without a router provider';

    case ERROR_CATEGORIES.MISSING_THEME_PROVIDER:
      return 'Component attempted to access theme values without a theme provider';

    case ERROR_CATEGORIES.MISSING_TRANSLATION_PROVIDER:
      return 'Component attempted to access translations without a translation provider';

    case ERROR_CATEGORIES.MISSING_PROVIDER:
      return 'Component attempted to access React context without a matching provider';

    case ERROR_CATEGORIES.MISSING_PORTAL_ROOT:
      return 'Component attempted to render a portal without a valid DOM container';

    case ERROR_CATEGORIES.HOOK_USAGE_ERROR:
      return 'React hook was used incorrectly';

    case ERROR_CATEGORIES.MODULE_IMPORT_ERROR:
      return 'A required dependency could not be resolved';

    case ERROR_CATEGORIES.TEST_FILE_IMPORT_ERROR:
      return 'Failed to import a test file during test execution';

    case ERROR_CATEGORIES.DYNAMIC_MODULE_IMPORT_ERROR:
      return 'Failed to dynamically import a module at runtime';

    case ERROR_CATEGORIES.COMPONENT_RENDER_ERROR:
      return 'Component failed during render due to a runtime error';

    case ERROR_CATEGORIES.SERVER_COMPONENTS_ERROR:
      return 'Server components usage in the browser';

    default:
      return 'Error could not be categorized';
  }
}
