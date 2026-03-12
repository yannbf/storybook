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

export interface ActionableStep {
  title: string;
  description: string;
}

export interface CategoryInfo {
  description: string;
  actionableSteps: ActionableStep[];
  docsLink?: string;
}

/** For a given category, return actionable steps and documentation link to help resolve the error. */
export function getCategoryInfo(category: ErrorCategory): CategoryInfo {
  switch (category) {
    case ERROR_CATEGORIES.MISSING_PROVIDER:
      return {
        description: getCategoryDescription(ERROR_CATEGORIES.MISSING_PROVIDER),
        actionableSteps: [
          {
            title: 'Add a decorator',
            description:
              'Wrap your story with the necessary context provider using a decorator in the story file or in .storybook/preview.js.',
          },
          {
            title: 'Check existing decorators',
            description:
              'Verify that your existing decorators provide the required context and that the provider is properly configured.',
          },
        ],
        docsLink: 'https://storybook.js.org/docs/writing-stories/decorators',
      };

    case ERROR_CATEGORIES.MISSING_STATE_PROVIDER:
      return {
        description: getCategoryDescription(ERROR_CATEGORIES.MISSING_STATE_PROVIDER),
        actionableSteps: [
          {
            title: 'Add a state management provider decorator',
            description:
              'Wrap your story with the required state provider (e.g. Redux Provider, Zustand store) using a decorator.',
          },
          {
            title: 'Configure globally',
            description:
              'Add the provider to the decorators array in .storybook/preview.js to apply it to all stories.',
          },
        ],
        docsLink: 'https://storybook.js.org/docs/writing-stories/decorators',
      };

    case ERROR_CATEGORIES.MISSING_ROUTER_PROVIDER:
      return {
        description: getCategoryDescription(ERROR_CATEGORIES.MISSING_ROUTER_PROVIDER),
        actionableSteps: [
          {
            title: 'Add a router decorator',
            description:
              'Wrap your story with the necessary router provider (e.g. MemoryRouter for React Router) using a decorator.',
          },
          {
            title: 'Use a framework integration',
            description:
              'Consider using a Storybook framework integration that includes router support out of the box.',
          },
        ],
        docsLink: 'https://storybook.js.org/docs/writing-stories/decorators',
      };

    case ERROR_CATEGORIES.MISSING_THEME_PROVIDER:
      return {
        description: getCategoryDescription(ERROR_CATEGORIES.MISSING_THEME_PROVIDER),
        actionableSteps: [
          {
            title: 'Add a theme provider decorator',
            description:
              'Wrap your story with the required theme provider (e.g. ThemeProvider from styled-components or Emotion) using a decorator.',
          },
          {
            title: 'Configure globally',
            description:
              'Add the theme provider to the decorators array in .storybook/preview.js to apply it to all stories.',
          },
        ],
        docsLink: 'https://storybook.js.org/docs/writing-stories/decorators',
      };

    case ERROR_CATEGORIES.MISSING_TRANSLATION_PROVIDER:
      return {
        description: getCategoryDescription(ERROR_CATEGORIES.MISSING_TRANSLATION_PROVIDER),
        actionableSteps: [
          {
            title: 'Add an i18n provider decorator',
            description:
              'Wrap your story with the required internationalization provider using a decorator.',
          },
          {
            title: 'Configure globally',
            description:
              'Add the i18n provider to the decorators array in .storybook/preview.js to apply it to all stories.',
          },
        ],
        docsLink: 'https://storybook.js.org/docs/writing-stories/decorators',
      };

    case ERROR_CATEGORIES.MISSING_PORTAL_ROOT:
      return {
        description: getCategoryDescription(ERROR_CATEGORIES.MISSING_PORTAL_ROOT),
        actionableSteps: [
          {
            title: 'Add a portal root element',
            description:
              'Ensure a valid DOM element exists for the portal target. Add it via a decorator or .storybook/preview-body.html.',
          },
          {
            title: 'Use a decorator',
            description:
              'Create a decorator that adds the portal container element to the DOM before the story renders.',
          },
        ],
        docsLink: 'https://storybook.js.org/docs/writing-stories/decorators',
      };

    case ERROR_CATEGORIES.HOOK_USAGE_ERROR:
      return {
        description: getCategoryDescription(ERROR_CATEGORIES.HOOK_USAGE_ERROR),
        actionableSteps: [
          {
            title: 'Follow the Rules of Hooks',
            description:
              'Ensure hooks are only called at the top level of a React function component or custom hook, not inside conditionals, loops, or nested functions.',
          },
          {
            title: 'Wrap in a component',
            description:
              'If you need to use hooks in a story, wrap the logic in a component that is rendered by the story function.',
          },
        ],
        docsLink: 'https://react.dev/warnings/invalid-hook-call-warning',
      };

    case ERROR_CATEGORIES.MODULE_IMPORT_ERROR:
      return {
        description: getCategoryDescription(ERROR_CATEGORIES.MODULE_IMPORT_ERROR),
        actionableSteps: [
          {
            title: 'Install the missing module',
            description:
              'Run your package manager install command (npm install, yarn, or pnpm install) to ensure all required dependencies are installed.',
          },
          {
            title: 'Check your Storybook configuration',
            description:
              'Verify your Storybook builder configuration picks up correct module aliases, paths, and resolve settings.',
          },
        ],
        docsLink: 'https://storybook.js.org/docs/builders/webpack',
      };

    case ERROR_CATEGORIES.DYNAMIC_MODULE_IMPORT_ERROR:
      return {
        description: getCategoryDescription(ERROR_CATEGORIES.DYNAMIC_MODULE_IMPORT_ERROR),
        actionableSteps: [
          {
            title: 'Clear cache and restart',
            description:
              'Delete the .storybook cache and restart Storybook to force module re-bundling.',
          },
          {
            title: 'Check Vite configuration',
            description:
              'Ensure your Vite configuration properly handles dynamic imports and that the module exists in your project.',
          },
        ],
        docsLink: 'https://storybook.js.org/docs/builders/vite',
      };

    case ERROR_CATEGORIES.SERVER_COMPONENTS_ERROR:
      return {
        description: getCategoryDescription(ERROR_CATEGORIES.SERVER_COMPONENTS_ERROR),
        actionableSteps: [
          {
            title: "Add 'use client' directive",
            description:
              "Add 'use client' at the top of your component file to mark it as a Client Component in Next.js.",
          },
          {
            title: 'Mock server components',
            description:
              "Use Storybook's module mocking to replace server-only modules with browser-compatible alternatives.",
          },
        ],
        docsLink: 'https://storybook.js.org/docs/get-started/frameworks/nextjs',
      };

    case ERROR_CATEGORIES.COMPONENT_RENDER_ERROR:
      return {
        description: getCategoryDescription(ERROR_CATEGORIES.COMPONENT_RENDER_ERROR),
        actionableSteps: [
          {
            title: 'Check required props',
            description:
              'Ensure all required props are provided in your story args and that prop types match what the component expects.',
          },
          {
            title: 'Add default values',
            description:
              'Provide default values for optional props that the component may access without null checks.',
          },
        ],
      };

    default:
      return {
        description: getCategoryDescription(ERROR_CATEGORIES.UNKNOWN_ERROR),
        actionableSteps: [
          {
            title: 'Check the browser console',
            description:
              'Open the browser developer tools and check the console for additional error details.',
          },
          {
            title: 'Check the terminal',
            description:
              'Review the terminal output where Storybook is running for compilation or server errors.',
          },
        ],
        docsLink: 'https://storybook.js.org/docs/configure',
      };
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
