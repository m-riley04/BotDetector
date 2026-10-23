/**
 * @jest-environment jsdom
 */
import { act } from 'preact/test-utils';
import type { BotDetectionReport } from '../src/detection/models';
import * as visuals from '../src/detection/visuals';
import { Post } from '../src/social-media/models';
import { getColorFromChance } from '../src/components/helpers';

const BOT_DETECTOR_CLOSE_OVERLAY = 'BOT_DETECTOR_CLOSE_OVERLAY';

const makePost = (fields: Record<string, unknown>) => fields as unknown as Post;

function makeReport(
  overrides: Partial<BotDetectionReport> = {}
): BotDetectionReport {
  return {
    chance: 0.72,
    checks: [
      {
        id: 'username',
        label: 'Username pattern',
        weight: 0.2,
        triggered: true,
        contribution: 0.2,
      },
      {
        id: 'verified',
        label: 'Verified account',
        weight: 0.1,
        triggered: false,
        contribution: 0,
      },
    ],
    isBot: true,
    isBotThreshold: 0.7,
    ...overrides,
  };
}

// Modals and badges render inside open shadow roots, so queries start from the host.
const modalHost = () => document.body.querySelector('body > div');
const modal = () => modalHost()?.shadowRoot ?? null;
const q = <T extends Element>(selector: string) =>
  modal()?.querySelector<T>(selector) ?? null;
const buttons = () =>
  Array.from(modal()?.querySelectorAll('button') ?? []).map(
    (b) => b.textContent
  );
const button = (label: string) =>
  Array.from(modal()?.querySelectorAll('button') ?? []).find(
    (b) => b.textContent === label
  ) as HTMLButtonElement;
const cellTexts = (row: Element) =>
  Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent);

// Lets pending promises and Preact's effect/state flushes settle.
const settle = () => new Promise((resolve) => setTimeout(resolve));
const click = (element?: HTMLElement | null) =>
  act(async () => {
    element?.click();
    await settle();
  });
const open = (...args: Parameters<typeof visuals.showReportModal>) =>
  act(async () => {
    visuals.showReportModal(...args);
    await settle();
  });

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
}

beforeEach(() => {
  document.body.replaceChildren();
});

test('getColorFromChance interpolates green, yellow, and red', () => {
  expect(getColorFromChance(0)).toBe('rgb(0,255,0)');
  expect(getColorFromChance(0.25)).toBe('rgb(128,255,0)');
  expect(getColorFromChance(0.5)).toBe('rgb(255,255,0)');
  expect(getColorFromChance(0.75)).toBe('rgb(255,128,0)');
  expect(getColorFromChance(1)).toBe('rgb(255,0,0)');
});

test('createBotElement displays the chance and opens the report modal', async () => {
  const element = visuals.createBotElement(
    makeReport(),
    makePost({ id: 'post-123' })
  );
  expect(element.tagName.toLowerCase()).toBe('div-botdetector');
  expect(element.getAttribute('aria-label')).toBe('Bot detection: 72% chance');

  const root = element.shadowRoot as ShadowRoot;
  expect(root.querySelector('p')?.textContent).toBe('Bot chance 72%');
  const badge = root.querySelector<HTMLElement>('.badge');
  expect(badge?.style.borderLeft).toContain('rgb(255, 143, 0)');

  const details = root.querySelector('button') as HTMLButtonElement;
  expect(details.textContent).toBe('Details');
  await click(details);

  expect(q('h3')?.textContent).toBe('Bot Chance: 72% | Likely a bot');
  expect(buttons()[0]).toBe('Copy post JSON');
});

test('the details panel copies the complete post as formatted JSON', async () => {
  const post = makePost({
    id: 'post-456',
    content: { text: 'A test post' },
    user: { screen_name: 'tester' },
  });
  let copiedText = '';
  stubClipboard(async (text) => {
    copiedText = text;
  });

  await open(makeReport(), post);
  await click(button('Copy post JSON'));

  expect(copiedText).toBe(JSON.stringify(post, null, 2));
  expect(q('[role=status]')?.textContent).toBe(
    'Post JSON copied to clipboard.'
  );
});

test('the details panel reports clipboard errors to the user', async () => {
  stubClipboard(async () => {
    throw new Error('Permission denied');
  });

  await open(makeReport(), makePost({ id: 'post-789' }));
  await click(button('Copy post JSON'));

  const status = q('[role=status]');
  expect(status?.textContent).toMatch(/Could not copy post JSON/);
  expect(status?.textContent).toMatch(/Permission denied/);
  expect(status?.classList.contains('error')).toBe(true);
});

test('showReportModal renders check contributions and threshold details', async () => {
  await open(
    makeReport({
      chance: 0.9999,
      isBot: false,
      checks: [
        {
          id: 'first',
          label: 'First check',
          weight: 0.6,
          triggered: true,
          contribution: 0.6,
        },
        {
          id: 'second',
          label: 'Second check',
          weight: 0.6,
          triggered: true,
          contribution: 0.6,
        },
        {
          id: 'third',
          label: 'Third check',
          weight: 0.1,
          triggered: false,
          contribution: 0,
        },
      ],
    })
  );

  expect(q('h3')?.textContent).toBe('Bot Chance: 99.99% | Probably not a bot');
  const rows = Array.from(modal()?.querySelectorAll('tr') ?? []);
  expect(rows.map(cellTexts)).toStrictEqual([
    ['Check', 'Weight', 'Added', 'Total'],
    ['✔ First check', '60%', '+60%', '60%'],
    ['✔ Second check', '60%', '+60%', '100%'],
    ['✘ Third check', '10%', '-', '100%'],
    ['Final (kept between 0% and 100%)', '', '', '99.99%'],
  ]);
  expect(q('.note')?.textContent).toBe('Marked as a bot at 70% or higher.');
});

test('showReportModal closes from its button or backdrop, but not panel content', async () => {
  await open(makeReport());

  await click(q<HTMLElement>('.panel'));
  expect(modalHost()).not.toBeNull();

  await click(button('Close'));
  expect(modalHost()).toBeNull();

  await open(makeReport({ isBot: false }));
  await click(q<HTMLElement>('.overlay'));
  expect(modalHost()).toBeNull();
});

test('showReportModal closes on the close-overlay event', async () => {
  await open(makeReport());
  expect(modalHost()).not.toBeNull();

  await act(() => {
    window.dispatchEvent(new CustomEvent(BOT_DETECTOR_CLOSE_OVERLAY));
  });
  expect(modalHost()).toBeNull();
});

test('the details panel offers copying the report next to the post', async () => {
  const report = makeReport();
  let copiedText = '';
  stubClipboard(async (text) => {
    copiedText = text;
  });

  await open(report, makePost({ id: 'post-1' }));
  expect(buttons()).toStrictEqual([
    'Copy post JSON',
    'Copy report JSON',
    'Close',
  ]);

  await click(button('Copy report JSON'));
  expect(copiedText).toBe(JSON.stringify(report, null, 2));
  expect(q('[role=status]')?.textContent).toBe(
    'Report JSON copied to clipboard.'
  );
});

test('list buttons reflect the status, call back and close the modal', async () => {
  const actions: string[] = [];
  const show = async (listStatus: 'none' | 'allowed' | 'blocked') => {
    document.body.replaceChildren();
    await open(makeReport(), makePost({ id: 't' }), {
      listStatus,
      onListAction: (action) => {
        actions.push(action);
      },
    });
    return buttons();
  };

  expect(await show('none')).toStrictEqual([
    'Copy post JSON',
    'Copy report JSON',
    'Mark as human',
    'Always hide',
    'Close',
  ]);
  expect(await show('allowed')).toContain('Remove from lists');
  expect(await show('allowed')).not.toContain('Mark as human');
  expect(await show('blocked')).not.toContain('Always hide');

  await show('none');
  await click(button('Always hide'));
  expect(actions).toStrictEqual(['block']);
  expect(modalHost()).toBeNull();
});

test('trust signals are shown as negative contributions', async () => {
  await open(
    makeReport({
      chance: 0.1,
      checks: [
        {
          id: 'a',
          label: 'Bad',
          weight: 0.3,
          triggered: true,
          contribution: 0.3,
        },
        {
          id: 'b',
          label: 'Trusted',
          weight: -0.2,
          triggered: true,
          contribution: -0.2,
        },
      ],
    })
  );
  const rows = Array.from(modal()?.querySelectorAll('tr') ?? []);
  expect(cellTexts(rows[2])).toStrictEqual([
    '✔ Trusted',
    '-20%',
    '-20%',
    '10%',
  ]);
  expect(rows[2].classList.contains('trust')).toBe(true);
});
