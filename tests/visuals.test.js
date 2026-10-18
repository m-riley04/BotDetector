import * as visuals from '../src/detection/visuals';

const BOT_DETECTOR_CLOSE_OVERLAY = 'BOT_DETECTOR_CLOSE_OVERLAY';

class TestElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.style = {};
    this.textContent = '';
    this.parentElement = null;
    this.onclick = null;
    this.attributes = {};
  }

  append(...elements) {
    for (const element of elements) {
      element.parentElement = this;
      this.children.push(element);
    }
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  insertBefore(element, reference) {
    element.parentElement = this;
    const index = this.children.indexOf(reference);
    this.children.splice(
      index === -1 ? this.children.length : index,
      0,
      element
    );
  }

  get firstElementChild() {
    return this.children[0] ?? null;
  }

  get lastElementChild() {
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

function installDocument() {
  const body = new TestElement('body');
  globalThis.document = {
    body,
    createElement: (tagName) => new TestElement(tagName),
  };

  const listeners = new Map();
  globalThis.window = {
    listeners,
    addEventListener: (type, listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener: (type, listener) =>
      listeners.get(type)?.delete(listener),
    dispatch: (type) => listeners.get(type)?.forEach((listener) => listener()),
  };
  return body;
}

function makeReport(overrides = {}) {
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

function cellTexts(row) {
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
  const tweet = { id_str: 'tweet-123', text: 'Example tweet' };
  const element = visuals.createBotElement(report, tweet);

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
  const tweet = {
    id_str: 'tweet-456',
    text: 'A test tweet',
    user: { screen_name: 'tester' },
  };
  let copiedText = '';
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    'navigator'
  );
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { writeText: async (text) => (copiedText = text) } },
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
      delete globalThis.navigator;
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
    visuals.showReportModal(makeReport(), { id_str: 'tweet-789' });
    const panel = body.children[0].children[0];
    await panel.children[3].children[0].onclick();

    expect(panel.children[4].textContent).toMatch(/Could not copy tweet JSON/);
    expect(panel.children[4].textContent).toMatch(/Permission denied/);
    expect(panel.children[4].style.color).toBe('#b91c1c');
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    } else {
      delete globalThis.navigator;
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
    'Final (capped at 100%)',
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
  expect(globalThis.window.listeners.get(BOT_DETECTOR_CLOSE_OVERLAY).size).toBe(
    1
  );

  globalThis.window.dispatch(BOT_DETECTOR_CLOSE_OVERLAY);
  expect(body.children.length).toBe(0);
  expect(globalThis.window.listeners.get(BOT_DETECTOR_CLOSE_OVERLAY).size).toBe(
    0
  );

  visuals.showReportModal(makeReport());
  body.children[0].children[0].children[3].children[0].onclick();
  expect(globalThis.window.listeners.get(BOT_DETECTOR_CLOSE_OVERLAY).size).toBe(
    0
  );
});
