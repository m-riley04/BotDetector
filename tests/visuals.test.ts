import type { BotDetectionReport } from '../src/detection/models';
import * as visuals from '../src/detection/visuals';
import type { Tweet } from '../src/twitter/models';

const BOT_DETECTOR_CLOSE_OVERLAY = 'BOT_DETECTOR_CLOSE_OVERLAY';

type Handler = (event?: { target: unknown }) => unknown;

class TestElement {
  tagName: string;
  children: TestElement[] = [];
  style: Record<string, string> = {};
  textContent = '';
  parentElement: TestElement | null = null;
  onclick: Handler = () => undefined;
  attributes: Record<string, string> = {};

  constructor(tagName: string) {
    this.tagName = tagName;
  }

  append(...elements: TestElement[]) {
    for (const element of elements) {
      element.parentElement = this;
      this.children.push(element);
    }
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }

  insertBefore(element: TestElement, reference: TestElement | null) {
    element.parentElement = this;
    const index = reference ? this.children.indexOf(reference) : -1;
    this.children.splice(
      index === -1 ? this.children.length : index,
      0,
      element
    );
  }

  get firstElementChild(): TestElement | null {
    return this.children[0] ?? null;
  }

  get lastElementChild(): TestElement | null {
    return this.children.at(-1) ?? null;
  }

  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter(
      (child) => child !== this
    );
    this.parentElement = null;
  }
}

// The stubs stand in for the browser globals, so they're installed through loose views of globalThis.
const g = globalThis as unknown as {
  document?: unknown;
  window?: unknown;
  navigator?: unknown;
};

interface TestWindow {
  listeners: Map<string, Set<() => void>>;
  dispatch: (type: string) => void;
}

const testWindow = () => g.window as TestWindow;
const asTest = (element: unknown) => element as TestElement;
const makeTweet = (fields: Record<string, unknown>) =>
  fields as unknown as Tweet;

function installDocument() {
  const body = new TestElement('body');
  g.document = {
    body,
    createElement: (tagName: string) => new TestElement(tagName),
  };

  const listeners = new Map<string, Set<() => void>>();
  g.window = {
    listeners,
    addEventListener: (type: string, listener: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(listener);
    },
    removeEventListener: (type: string, listener: () => void) =>
      listeners.get(type)?.delete(listener),
    dispatch: (type: string) =>
      listeners.get(type)?.forEach((listener) => listener()),
  };
  return body;
}

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
    isVerified: false,
    isVerifiedBusiness: false,
    isQuotedUserVerified: false,
    isQuotedUserBusiness: false,
    didQuoteCheckmark: false,
    isBot: true,
    isBotThreshold: 0.7,
    ...overrides,
  };
}

function cellTexts(row: TestElement) {
  return row.children.map((cell) => cell.textContent);
}

test('getColorFromChance interpolates green, yellow, and red', () => {
  expect(visuals.getColorFromChance(0)).toBe('rgb(0,255,0)');
  expect(visuals.getColorFromChance(0.25)).toBe('rgb(128,255,0)');
  expect(visuals.getColorFromChance(0.5)).toBe('rgb(255,255,0)');
  expect(visuals.getColorFromChance(0.75)).toBe('rgb(255,128,0)');
  expect(visuals.getColorFromChance(1)).toBe('rgb(255,0,0)');
});

test('createBotElement displays the chance and opens the report modal', () => {
  const body = installDocument();
  const report = makeReport();
  const tweet = makeTweet({ id_str: 'tweet-123', text: 'Example tweet' });
  const element = asTest(visuals.createBotElement(report, tweet));

  expect(element.tagName).toBe('div-botdetector');
  expect(element.style.backgroundColor).toBe('#111827');
  expect(element.style.borderLeft).toBe('4px solid rgb(255,143,0)');
  expect(element.style.position).toBe('fixed');
  expect(element.children[0].textContent).toBe('Bot chance 72%');

  const infoButton = element.children[1];
  expect(infoButton.textContent).toBe('Details');
  infoButton.onclick();

  expect(body.children.length).toBe(1);
  expect(body.children[0].children[0].children[0].textContent).toBe(
    'Bot Chance: 72% | Likely a bot'
  );
  expect(body.children[0].children[0].children[3].children[0].textContent).toBe(
    'Copy tweet JSON'
  );
});

test('the details panel copies the complete tweet as formatted JSON', async () => {
  const body = installDocument();
  const tweet = makeTweet({
    id_str: 'tweet-456',
    text: 'A test tweet',
    user: { screen_name: 'tester' },
  });
  let copiedText = '';
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    'navigator'
  );
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: async (text: string) => {
          copiedText = text;
        },
      },
    },
  });

  try {
    visuals.showReportModal(makeReport(), tweet);
    const panel = body.children[0].children[0];
    const actions = panel.children[3];
    await actions.children[0].onclick();

    expect(copiedText).toBe(JSON.stringify(tweet, null, 2));
    expect(panel.children[4].textContent).toBe(
      'Tweet JSON copied to clipboard.'
    );
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    } else {
      delete g.navigator;
    }
  }
});

test('the details panel reports clipboard errors to the user', async () => {
  const body = installDocument();
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    'navigator'
  );
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: async () => {
          throw new Error('Permission denied');
        },
      },
    },
  });

  try {
    visuals.showReportModal(makeReport(), makeTweet({ id_str: 'tweet-789' }));
    const panel = body.children[0].children[0];
    await panel.children[3].children[0].onclick();

    expect(panel.children[4].textContent).toMatch(/Could not copy tweet JSON/);
    expect(panel.children[4].textContent).toMatch(/Permission denied/);
    expect(panel.children[4].style.color).toBe('#b91c1c');
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    } else {
      delete g.navigator;
    }
  }
});

test('showReportModal renders check contributions and threshold details', () => {
  const body = installDocument();
  visuals.showReportModal(
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

  const overlay = body.children[0];
  const panel = overlay.children[0];
  expect(panel.children[0].textContent).toBe(
    'Bot Chance: 99.99% | Probably not a bot'
  );

  const table = panel.children[1];
  expect(cellTexts(table.children[0])).toStrictEqual([
    'Check',
    'Weight',
    'Added',
    'Total',
  ]);
  expect(cellTexts(table.children[1])).toStrictEqual([
    '✔ First check',
    '60%',
    '+60%',
    '60%',
  ]);
  expect(cellTexts(table.children[2])).toStrictEqual([
    '✔ Second check',
    '60%',
    '+60%',
    '100%',
  ]);
  expect(cellTexts(table.children[3])).toStrictEqual([
    '✘ Third check',
    '10%',
    '-',
    '100%',
  ]);
  expect(cellTexts(table.children[4])).toStrictEqual([
    'Final (kept between 0% and 100%)',
    '',
    '',
    '99.99%',
  ]);
  expect(panel.children[2].textContent).toBe(
    'Marked as a bot at 70% or higher.'
  );
});

test('showReportModal closes from its button or backdrop, but not panel content', () => {
  const body = installDocument();
  visuals.showReportModal(makeReport());
  const overlay = body.children[0];
  const panel = overlay.children[0];

  overlay.onclick({ target: panel });
  expect(body.children.length).toBe(1);

  panel.children[3].children[0].onclick();
  expect(body.children.length).toBe(0);

  visuals.showReportModal(makeReport({ isBot: false }));
  const secondOverlay = body.children[0];
  secondOverlay.onclick({ target: secondOverlay });
  expect(body.children.length).toBe(0);
});

test('showReportModal closes on the close-overlay event and removes its listener', () => {
  const body = installDocument();
  visuals.showReportModal(makeReport());
  expect(testWindow().listeners.get(BOT_DETECTOR_CLOSE_OVERLAY)?.size).toBe(1);

  testWindow().dispatch(BOT_DETECTOR_CLOSE_OVERLAY);
  expect(body.children.length).toBe(0);
  expect(testWindow().listeners.get(BOT_DETECTOR_CLOSE_OVERLAY)?.size).toBe(0);

  visuals.showReportModal(makeReport());
  body.children[0].children[0].children[3].children[0].onclick();
  expect(testWindow().listeners.get(BOT_DETECTOR_CLOSE_OVERLAY)?.size).toBe(0);
});

test('the details panel offers copying the report next to the tweet', async () => {
  const body = installDocument();
  const report = makeReport();
  let copiedText = '';
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    'navigator'
  );
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: async (text: string) => {
          copiedText = text;
        },
      },
    },
  });

  try {
    visuals.showReportModal(report, makeTweet({ id_str: 'tweet-1' }));
    const panel = body.children[0].children[0];
    const actions = panel.children[3];
    expect(actions.children.map((b) => b.textContent)).toStrictEqual([
      'Copy tweet JSON',
      'Copy report JSON',
      'Close',
    ]);

    await actions.children[1].onclick();
    expect(copiedText).toBe(JSON.stringify(report, null, 2));
    expect(panel.children[4].textContent).toBe(
      'Report JSON copied to clipboard.'
    );
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    } else {
      delete g.navigator;
    }
  }
});

test('list buttons reflect the status, call back and close the modal', async () => {
  const body = installDocument();
  const actions: string[] = [];
  const open = (listStatus: 'none' | 'allowed' | 'blocked') => {
    body.children.length = 0;
    visuals.showReportModal(makeReport(), makeTweet({ id_str: 't' }), {
      listStatus,
      onListAction: (action) => {
        actions.push(action);
      },
    });
    return body.children[0].children[0].children[3];
  };
  const labels = (bar: TestElement) => bar.children.map((b) => b.textContent);

  expect(labels(open('none'))).toStrictEqual([
    'Copy tweet JSON',
    'Copy report JSON',
    'Mark as human',
    'Always hide',
    'Close',
  ]);
  expect(labels(open('allowed'))).toContain('Remove from lists');
  expect(labels(open('allowed'))).not.toContain('Mark as human');
  expect(labels(open('blocked'))).not.toContain('Always hide');

  const bar = open('none');
  await bar.children[3].onclick();
  expect(actions).toStrictEqual(['block']);
  expect(body.children.length).toBe(0);
});

test('trust signals are shown as negative contributions', () => {
  const body = installDocument();
  visuals.showReportModal(
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
  const table = body.children[0].children[0].children[1];
  expect(cellTexts(table.children[2])).toStrictEqual([
    '✔ Trusted',
    '-20%',
    '-20%',
    '10%',
  ]);
  expect(table.children[2].style.cssText).toMatch(/#065f46/);
});
