import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { test } from 'node:test';

const BOT_DETECTOR_CLOSE_OVERLAY = 'BOT_DETECTOR_CLOSE_OVERLAY';

const { outputFiles } = await build({
  entryPoints: ['src/detection/visuals.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
});
const visuals = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
);

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
  assert.equal(visuals.getColorFromChance(0), 'rgb(0,255,0)');
  assert.equal(visuals.getColorFromChance(0.25), 'rgb(128,255,0)');
  assert.equal(visuals.getColorFromChance(0.5), 'rgb(255,255,0)');
  assert.equal(visuals.getColorFromChance(0.75), 'rgb(255,128,0)');
  assert.equal(visuals.getColorFromChance(1), 'rgb(255,0,0)');
});

test('createBotElement displays the chance and opens the report modal', () => {
  const body = installDocument();
  const report = makeReport();
  const tweet = { id_str: 'tweet-123', text: 'Example tweet' };
  const element = visuals.createBotElement(report, tweet);

  assert.equal(element.tagName, 'div-botdetector');
  assert.equal(element.style.backgroundColor, '#111827');
  assert.equal(element.style.borderLeft, '4px solid rgb(255,143,0)');
  assert.equal(element.style.position, 'fixed');
  assert.equal(element.children[0].textContent, 'Bot chance 72%');

  const infoButton = element.children[1];
  assert.equal(infoButton.textContent, 'Details');
  infoButton.onclick();

  assert.equal(body.children.length, 1);
  assert.equal(
    body.children[0].children[0].children[0].textContent,
    'Bot Chance: 72% | Likely a bot'
  );
  assert.equal(
    body.children[0].children[0].children[3].children[0].textContent,
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

    assert.equal(copiedText, JSON.stringify(tweet, null, 2));
    assert.equal(
      panel.children[4].textContent,
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

    assert.match(panel.children[4].textContent, /Could not copy tweet JSON/);
    assert.match(panel.children[4].textContent, /Permission denied/);
    assert.equal(panel.children[4].style.color, '#b91c1c');
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
  assert.equal(
    panel.children[0].textContent,
    'Bot Chance: 99.99% | Probably not a bot'
  );

  const table = panel.children[1];
  assert.deepEqual(cellTexts(table.children[0]), [
    'Check',
    'Weight',
    'Added',
    'Total',
  ]);
  assert.deepEqual(cellTexts(table.children[1]), [
    '✔ First check',
    '60%',
    '+60%',
    '60%',
  ]);
  assert.deepEqual(cellTexts(table.children[2]), [
    '✔ Second check',
    '60%',
    '+60%',
    '100%',
  ]);
  assert.deepEqual(cellTexts(table.children[3]), [
    '✘ Third check',
    '10%',
    '-',
    '100%',
  ]);
  assert.deepEqual(cellTexts(table.children[4]), [
    'Final (capped at 100%)',
    '',
    '',
    '99.99%',
  ]);
  assert.equal(
    panel.children[2].textContent,
    'Marked as a bot at 70% or higher.'
  );
});

test('showReportModal closes from its button or backdrop, but not panel content', () => {
  const body = installDocument();
  visuals.showReportModal(makeReport());
  const overlay = body.children[0];
  const panel = overlay.children[0];

  overlay.onclick({ target: panel });
  assert.equal(body.children.length, 1);

  panel.children[3].children[0].onclick();
  assert.equal(body.children.length, 0);

  visuals.showReportModal(makeReport({ isBot: false }));
  const secondOverlay = body.children[0];
  secondOverlay.onclick({ target: secondOverlay });
  assert.equal(body.children.length, 0);
});

test('showReportModal closes on the close-overlay event and removes its listener', () => {
  const body = installDocument();
  visuals.showReportModal(makeReport());
  assert.equal(
    globalThis.window.listeners.get(BOT_DETECTOR_CLOSE_OVERLAY).size,
    1
  );

  globalThis.window.dispatch(BOT_DETECTOR_CLOSE_OVERLAY);
  assert.equal(body.children.length, 0);
  assert.equal(
    globalThis.window.listeners.get(BOT_DETECTOR_CLOSE_OVERLAY).size,
    0
  );

  visuals.showReportModal(makeReport());
  body.children[0].children[0].children[3].children[0].onclick();
  assert.equal(
    globalThis.window.listeners.get(BOT_DETECTOR_CLOSE_OVERLAY).size,
    0
  );
});
