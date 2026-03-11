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

export interface CategoryGuidance {
  /** Short description of what caused the error */
  description: string;
  /** Actionable instructions to resolve the error */
  instructions: string[];
  /** Link to relevant Storybook documentation */
  docsLink?: string;
}

/**
 * For a given error category, return actionable guidance including a description, step-by-step
 * instructions, and an optional link to relevant documentation. Returns null for unknown errors
 * where no specific guidance is available.
 */
export function getCategoryGuidance(category: ErrorCategory): CategoryGuidance | null {
  switch (category) {
    case ERROR_CATEGORIES.MISSING_STATE_PROVIDER:
      return {
        description: getCategoryDescription(category),
        instructions: [
          'Wrap your component with the required state management provider using a decorator in your story or in preview.js.',
          'For example: `decorators: [(Story) => <Provider store={store}><Story /></Provider>]`',
        ],
        docsLink: 'https://storybook.js.org/docs/writing-stories/decorators',
      };

    case ERROR_CATEGORIES.MISSING_ROUTER_PROVIDER:
      return {
        description: getCategoryDescription(category),
        instructions: [
          'Wrap your component with a Router provider using a decorator in your story or in preview.js.',
          'For example: `decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>]`',
        ],
        docsLink: 'https://storybook.js.org/docs/writing-stories/decorators',
      };

    case ERROR_CATEGORIES.MISSING_THEME_PROVIDER:
      return {
        description: getCategoryDescription(category),
        instructions: [
          'Wrap your component with a ThemeProvider using a decorator in your story or in preview.js.',
          'For example: `decorators: [(Story) => <ThemeProvider theme={theme}><Story /></ThemeProvider>]`',
        ],
        docsLink: 'https://storybook.js.org/docs/writing-stories/decorators',
      };

    case ERROR_CATEGORIES.MISSING_TRANSLATION_PROVIDER:
      return {
        description: getCategoryDescription(category),
        instructions: [
          'Wrap your component with the required i18n provider using a decorator in your story or in preview.js.',
          'For example: `decorators: [(Story) => <I18nextProvider i18n={i18n}><Story /></I18nextProvider>]`',
        ],
        docsLink: 'https://storybook.js.org/docs/writing-stories/decorators',
      };

    case ERROR_CATEGORIES.MISSING_PROVIDER:
      return {
        description: getCategoryDescription(category),
        instructions: [
          'Wrap your component with the required context provider using a decorator in your story or in preview.js.',
          'For example: `decorators: [(Story) => <MyContext.Provider value={...}><Story /></MyContext.Provider>]`',
        ],
        docsLink: 'https://storybook.js.org/docs/writing-stories/decorators',
      };

    case ERROR_CATEGORIES.MISSING_PORTAL_ROOT:
      return {
        description: getCategoryDescription(category),
        instructions: [
          'Ensure a DOM element for the portal exists in the preview. You can add it via a decorator or in preview-head.html.',
          'For example: `decorators: [(Story) => <><Story /><div id="portal-root" /></>]`',
        ],
        docsLink: 'https://storybook.js.org/docs/writing-stories/decorators',
      };

    case ERROR_CATEGORIES.HOOK_USAGE_ERROR:
      return {
        description: getCategoryDescription(category),
        instructions: [
          'Ensure hooks are only called at the top level of a React function component, not inside loops, conditions, or nested functions.',
          'Check that you are not calling hooks from non-React functions.',
        ],
        docsLink: 'https://react.dev/reference/rules/rules-of-hooks',
      };

    case ERROR_CATEGORIES.MODULE_IMPORT_ERROR:
      return {
        description: getCategoryDescription(category),
        instructions: [
          'Verify the package is installed by running your package manager install command.',
          'Check that your Webpack or Vite configuration includes the correct module aliases or resolvers.',
        ],
        docsLink: 'https://storybook.js.org/docs/configure/integration/compilers',
      };

    case ERROR_CATEGORIES.DYNAMIC_MODULE_IMPORT_ERROR:
      return {
        description: getCategoryDescription(category),
        instructions: [
          'Verify the dynamically imported module exists and is accessible at the given path.',
          'Check that your bundler configuration supports dynamic imports.',
        ],
        docsLink: 'https://storybook.js.org/docs/builders/vite',
      };

    case ERROR_CATEGORIES.SERVER_COMPONENTS_ERROR:
      return {
        description: getCategoryDescription(category),
        instructions: [
          "Add the 'use client' directive at the top of the component file or its dependencies.",
          'Storybook renders components in the browser. Server components must be wrapped or replaced with client-side equivalents.',
        ],
        docsLink: 'https://storybook.js.org/docs/get-started/frameworks/nextjs',
      };

    case ERROR_CATEGORIES.COMPONENT_RENDER_ERROR:
      return {
        description: getCategoryDescription(category),
        instructions: [
          'Check for undefined or null values being accessed in your component.',
          'Verify that all required props are provided in your story args.',
        ],
        docsLink: 'https://storybook.js.org/docs/writing-stories',
      };

    case ERROR_CATEGORIES.TEST_FILE_IMPORT_ERROR:
      return {
        description: getCategoryDescription(category),
        instructions: [
          'Verify the test file path is correct and the file exists.',
          'Check that your test setup file is properly configured in your Storybook or Vitest config.',
        ],
        docsLink: 'https://storybook.js.org/docs/writing-tests/test-addon',
      };

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
