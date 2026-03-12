import { logger } from 'storybook/internal/client-logger';
import type { PreparedStory } from 'storybook/internal/types';

import { global } from '@storybook/global';

import AnsiToHtml from 'ansi-to-html';
import { parse } from 'picoquery';
import { dedent } from 'ts-dedent';

import {
  ERROR_CATEGORIES,
  categorizeError,
  getCategoryInfo,
} from '../../../shared/utils/categorize-render-errors';
import type { View } from './View';

const { document } = global;

const PREPARING_DELAY = 100;

enum Mode {
  'MAIN' = 'MAIN',
  'NOPREVIEW' = 'NOPREVIEW',
  'PREPARING_STORY' = 'PREPARING_STORY',
  'PREPARING_DOCS' = 'PREPARING_DOCS',
  'ERROR' = 'ERROR',
}
const classes: Record<Mode, string> = {
  PREPARING_STORY: 'sb-show-preparing-story',
  PREPARING_DOCS: 'sb-show-preparing-docs',
  MAIN: 'sb-show-main',
  NOPREVIEW: 'sb-show-nopreview',
  ERROR: 'sb-show-errordisplay',
};

const layoutClassMap = {
  centered: 'sb-main-centered',
  fullscreen: 'sb-main-fullscreen',
  padded: 'sb-main-padded',
} as const;
type Layout = keyof typeof layoutClassMap | 'none';

const ansiConverter = new AnsiToHtml({
  escapeXML: true,
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatErrorStack(message: string, stack: string): string {
  if (!stack && !message) {
    return '';
  }
  if (!stack) {
    return message;
  }
  // If the message is multiline, it's already embedded in the stack display
  const isMultiline = message.includes('\n');
  if (isMultiline) {
    return stack || message;
  }
  return `${message}\n\n${stack}`;
}

function copyErrorToClipboard(btn: HTMLElement, errorText: string) {
  const originalText = btn.textContent || 'Copy error';
  const resetText = () => {
    btn.textContent = originalText;
  };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(errorText).then(() => {
      btn.textContent = 'Copied!';
      setTimeout(resetText, 2000);
    });
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = errorText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    btn.textContent = 'Copied!';
    setTimeout(resetText, 2000);
  }
}

export class WebView implements View<HTMLElement> {
  private currentLayoutClass?: (typeof layoutClassMap)[keyof typeof layoutClassMap] | null;

  private testing = false;

  private preparingTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    // Special code for testing situations
    if (typeof document !== 'undefined') {
      const { __SPECIAL_TEST_PARAMETER__ } = parse(document.location.search.slice(1));
      switch (__SPECIAL_TEST_PARAMETER__) {
        case 'preparing-story': {
          this.showPreparingStory();
          this.testing = true;
          break;
        }
        case 'preparing-docs': {
          this.showPreparingDocs();
          this.testing = true;
          break;
        }
        default: // pass;
      }
    }
  }

  // Get ready to render a story, returning the element to render to
  prepareForStory(story: PreparedStory<any>) {
    this.showStory();
    this.applyLayout(story.parameters.layout);

    document.documentElement.scrollTop = 0;
    document.documentElement.scrollLeft = 0;

    return this.storyRoot();
  }

  storyRoot(): HTMLElement {
    return document.getElementById('storybook-root')!;
  }

  prepareForDocs() {
    this.showMain();
    this.showDocs();
    this.applyLayout('fullscreen');

    document.documentElement.scrollTop = 0;
    document.documentElement.scrollLeft = 0;

    return this.docsRoot();
  }

  docsRoot(): HTMLElement {
    return document.getElementById('storybook-docs')!;
  }

  applyLayout(layout: Layout = 'padded') {
    if (layout === 'none') {
      document.body.classList.remove(this.currentLayoutClass!);
      this.currentLayoutClass = null;
      return;
    }

    this.checkIfLayoutExists(layout);

    const layoutClass = layoutClassMap[layout];

    document.body.classList.remove(this.currentLayoutClass!);
    document.body.classList.add(layoutClass);
    this.currentLayoutClass = layoutClass;
  }

  checkIfLayoutExists(layout: keyof typeof layoutClassMap) {
    if (!layoutClassMap[layout]) {
      logger.warn(
        dedent`
          The desired layout: ${layout} is not a valid option.
          The possible options are: ${Object.keys(layoutClassMap).join(', ')}, none.
        `
      );
    }
  }

  showMode(mode: Mode) {
    clearTimeout(this.preparingTimeout);
    Object.keys(Mode).forEach((otherMode) => {
      if (otherMode === mode) {
        document.body.classList.add(classes[otherMode]);
      } else {
        document.body.classList.remove(classes[otherMode as Mode]);
      }
    });
  }

  showErrorDisplay({ message = '', stack = '' }) {
    let header = message;
    const parts = message.split('\n');
    if (parts.length > 1) {
      [header] = parts;
    }

    document.getElementById('error-message')!.innerHTML = ansiConverter.toHtml(header);
    document.getElementById('error-stack')!.innerHTML = ansiConverter.toHtml(
      formatErrorStack(message, stack)
    );

    // Categorize the error and populate actionable information
    const { category, matchedDependencies } = categorizeError(message, stack);
    const categoryInfo = getCategoryInfo(category);
    const isUnknown = category === ERROR_CATEGORIES.UNKNOWN_ERROR;

    // Populate category description
    const descriptionEl = document.getElementById('error-category-description');
    if (descriptionEl) {
      const deps =
        matchedDependencies.length > 0 ? ` (detected: ${matchedDependencies.join(', ')})` : '';
      descriptionEl.textContent = `${categoryInfo.description}${deps}.`;
    }

    // Populate actionable steps
    const stepsContainer = document.getElementById('error-actionable-steps');
    if (stepsContainer) {
      stepsContainer.innerHTML = categoryInfo.actionableSteps
        .map(
          (step) =>
            `<li><strong>${escapeHtml(step.title)}</strong>: ${escapeHtml(step.description)}</li>`
        )
        .join('');
    }

    // Show/hide the context section
    const contextEl = document.getElementById('error-context');
    if (contextEl) {
      if (isUnknown) {
        contextEl.classList.add('sb-errordisplay_context--unknown');
      } else {
        contextEl.classList.remove('sb-errordisplay_context--unknown');
      }
    }

    // Update docs link
    const docsLinkEl = document.getElementById('error-docs-link') as HTMLAnchorElement | null;
    if (docsLinkEl) {
      if (categoryInfo.docsLink) {
        docsLinkEl.href = categoryInfo.docsLink;
        docsLinkEl.removeAttribute('hidden');
      } else {
        docsLinkEl.setAttribute('hidden', 'true');
      }
    }

    // Attach copy button handler
    const copyBtn = document.getElementById('error-copy-btn');
    if (copyBtn) {
      const errorText = [message, stack].filter(Boolean).join('\n\n');
      // Clone to remove any previously attached listener
      const newCopyBtn = copyBtn.cloneNode(true) as HTMLElement;
      copyBtn.replaceWith(newCopyBtn);
      newCopyBtn.addEventListener('click', () => {
        copyErrorToClipboard(newCopyBtn, errorText);
      });
    }

    this.showMode(Mode.ERROR);
  }

  showNoPreview() {
    if (this.testing) {
      return;
    }

    this.showMode(Mode.NOPREVIEW);

    // In storyshots this can get called and these two can be null
    this.storyRoot()?.setAttribute('hidden', 'true');
    this.docsRoot()?.setAttribute('hidden', 'true');
  }

  showPreparingStory({ immediate = false } = {}) {
    clearTimeout(this.preparingTimeout);

    if (immediate) {
      this.showMode(Mode.PREPARING_STORY);
    } else {
      this.preparingTimeout = setTimeout(
        () => this.showMode(Mode.PREPARING_STORY),
        PREPARING_DELAY
      );
    }
  }

  showPreparingDocs({ immediate = false } = {}) {
    clearTimeout(this.preparingTimeout);
    if (immediate) {
      this.showMode(Mode.PREPARING_DOCS);
    } else {
      this.preparingTimeout = setTimeout(() => this.showMode(Mode.PREPARING_DOCS), PREPARING_DELAY);
    }
  }

  showMain() {
    this.showMode(Mode.MAIN);
  }

  showDocs() {
    this.storyRoot().setAttribute('hidden', 'true');
    this.docsRoot().removeAttribute('hidden');
  }

  showStory() {
    this.docsRoot().setAttribute('hidden', 'true');
    this.storyRoot().removeAttribute('hidden');
  }

  showStoryDuringRender() {
    // When 'showStory' is called (at the start of rendering) we get rid of our display:none
    // from all children of the root (but keep the preparing spinner visible). This may mean
    // that very weird and high z-index stories are briefly visible.
    // See https://github.com/storybookjs/storybook/issues/16847 and
    //   http://localhost:9011/?path=/story/core-rendering--auto-focus (official SB)
    document.body.classList.add(classes.MAIN);
  }
}
