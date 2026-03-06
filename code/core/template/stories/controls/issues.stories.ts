import type { PartialStoryFn, StoryContext } from 'storybook/internal/types';

import { global as globalThis } from '@storybook/global';

export default {
  component: globalThis.__TEMPLATE_COMPONENTS__.Pre,
  decorators: [
    (storyFn: PartialStoryFn, context: StoryContext) =>
      storyFn({ args: { object: { ...context.args } } }),
  ],
};

// https://github.com/storybookjs/storybook/issues/14752
export const MissingRadioOptions = {
  argTypes: { invalidRadio: { control: 'radio' } },
  args: { invalidRadio: 'someValue' },
};

// https://github.com/yannbf/storybook/issues/7
export const TallDetailPopover = {
  argTypes: {
    icon: {
      control: 'text',
      table: {
        type: {
          summary: 'IconName',
          detail: Array.from(
            { length: 50 },
            (_, i) =>
              `'filter' | 'search' | 'close' | 'info' | 'alertCircle' | 'icon${String(i)}'`
          ).join('\n| '),
        },
      },
    },
  },
  args: { icon: 'filter' },
};
