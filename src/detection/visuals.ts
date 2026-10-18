import { BOT_ELEMENT } from '../common/constants';
import type { Tweet } from '../twitter/models';
import { BOT_DETECTOR_CLOSE_OVERLAY } from './constants';
import type { BotDetectionReport } from './models';

const pct = (n: number) => `${Number((n * 100).toFixed(2))}%`;

function styleButton(button: HTMLButtonElement): void {
  button.style.border = '1px solid #374151';
  button.style.borderRadius = '6px';
  button.style.padding = '7px 12px';
  button.style.background = '#1f2937';
  button.style.color = '#f9fafb';
  button.style.font = '600 13px sans-serif';
  button.style.cursor = 'pointer';
}

function row(cells: string[], style = ''): HTMLTableRowElement {
  const tr = document.createElement('tr');
  tr.style.cssText = style;
  cells.forEach((text, i) => {
    const td = document.createElement('td');
    td.textContent = text;
    td.style.padding = '3px 8px';
    if (i > 0) td.style.textAlign = 'right';
    tr.append(td);
  });
  return tr;
}

/**
 * Shows a modal breaking down how each check contributed to the final score.
 */
export function showReportModal(
  report: BotDetectionReport,
  tweet?: Tweet
): void {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(15, 23, 42, .68)';
  overlay.style.backdropFilter = 'blur(3px)';
  overlay.style.zIndex = '2147483647';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.padding = '16px';

  const closeOverlayHandler = () => {
    window.removeEventListener(BOT_DETECTOR_CLOSE_OVERLAY, closeOverlayHandler);
    overlay.remove();
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) closeOverlayHandler();
  };
  window.addEventListener(BOT_DETECTOR_CLOSE_OVERLAY, closeOverlayHandler);

  const panel = document.createElement('div');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.style.background = '#fff';
  panel.style.color = '#111827';
  panel.style.font = '14px/1.5 system-ui, sans-serif';
  panel.style.border = '1px solid #e5e7eb';
  panel.style.borderRadius = '12px';
  panel.style.padding = '20px';
  panel.style.width = 'min(560px, 100%)';
  panel.style.maxHeight = 'min(80vh, 720px)';
  panel.style.overflow = 'auto';
  panel.style.boxShadow = '0 24px 64px rgba(0, 0, 0, .28)';

  const title = document.createElement('h3');
  title.textContent = `Bot Chance: ${pct(report.chance)} | ${
    report.isBot ? 'Likely a bot' : 'Probably not a bot'
  }`;
  title.style.margin = '0 0 16px';
  title.style.font = '600 18px/1.3 system-ui, sans-serif';
  panel.append(title);

  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';
  table.style.width = '100%';
  table.style.font = '13px/1.45 system-ui, sans-serif';
  table.append(
    row(
      ['Check', 'Weight', 'Added', 'Total'],
      'font-weight:600;background:#f3f4f6;color:#374151;'
    )
  );

  let running = 0;
  for (const c of report.checks) {
    running += c.contribution;
    table.append(
      row(
        [
          `${c.triggered ? '✔' : '✘'} ${c.label}`,
          pct(c.weight),
          c.triggered ? `+${pct(c.contribution)}` : '-',
          pct(Math.min(running, 1)),
        ],
        c.triggered ? 'background:#fff1f2;color:#881337;' : 'color:#6b7280;'
      )
    );
  }
  table.append(
    row(
      ['Final (capped at 100%)', '', '', pct(report.chance)],
      'font-weight:600;border-top:2px solid #d1d5db;color:#111827;'
    )
  );
  panel.append(table);

  const note = document.createElement('p');
  note.textContent = `Marked as a bot at ${pct(report.isBotThreshold)} or higher.`;
  note.style.margin = '14px 0 16px';
  note.style.color = '#6b7280';
  panel.append(note);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '8px';

  const close = document.createElement('button');
  close.textContent = 'Close';
  styleButton(close);
  close.style.background = '#fff';
  close.style.color = '#374151';
  close.onclick = () => closeOverlayHandler();
  actions.append(close);
  panel.append(actions);
  if (tweet) addCopyTweetButton(panel, tweet);

  overlay.append(panel);
  document.body.append(overlay);
}

function addCopyTweetButton(panel: HTMLElement, tweet: Tweet): void {
  const actions = panel.lastElementChild;
  if (!actions) return;

  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy tweet JSON';
  copyButton.setAttribute('type', 'button');
  styleButton(copyButton);

  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.style.margin = '10px 0 0';
  status.style.font = '13px/1.4 system-ui, sans-serif';
  status.style.color = '#047857';

  copyButton.onclick = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable in this page.');
      }
      await navigator.clipboard.writeText(JSON.stringify(tweet, null, 2));
      status.textContent = 'Tweet JSON copied to clipboard.';
      status.style.color = '#047857';
    } catch (error) {
      status.textContent = `Could not copy tweet JSON: ${
        error instanceof Error ? error.message : String(error)
      }`;
      status.style.color = '#b91c1c';
    }
  };

  actions.insertBefore(copyButton, actions.firstElementChild);
  panel.append(status);
}

/**
 * Returns a color string based on the chance value.
 * @param chance The chance value to determine the color. Between 0-1.
 * @returns A color string based on the chance value.
 */
export function getColorFromChance(chance: number): string {
  const red = [255, 0, 0];
  const yellow = [255, 255, 0];
  const green = [0, 255, 0];

  let r: number, g: number, b: number;
  if (chance < 0.5) {
    const t = chance / 0.5;
    r = green[0] + t * (yellow[0] - green[0]);
    g = green[1] + t * (yellow[1] - green[1]);
    b = green[2] + t * (yellow[2] - green[2]);
  } else {
    const t = (chance - 0.5) / 0.5;
    r = yellow[0] + t * (red[0] - yellow[0]);
    g = yellow[1] + t * (red[1] - yellow[1]);
    b = yellow[2] + t * (red[2] - yellow[2]);
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/**
 * Creates the tag element for displaying bot chance.
 * @param report The bot detection report containing the chance value.
 * @returns An HTML element representing the bot chance tag.
 */
export function createBotElement(
  report: BotDetectionReport,
  tweet: Tweet
): HTMLElement {
  const bg = document.createElement(BOT_ELEMENT);
  bg.setAttribute('aria-label', `Bot detection: ${pct(report.chance)} chance`);
  const text = document.createElement('p');

  text.textContent = `Bot chance ${pct(report.chance)}`;
  text.style.margin = '0';
  text.style.font = '600 13px/1.2 system-ui, sans-serif';
  text.style.whiteSpace = 'nowrap';

  bg.style.display = 'flex';
  bg.style.alignItems = 'center';
  bg.style.gap = '10px';
  bg.style.backgroundColor = '#111827';
  bg.style.border = '1px solid rgba(255,255,255,.16)';
  bg.style.borderLeft = `4px solid ${getColorFromChance(report.chance)}`;
  bg.style.borderRadius = '0 0 0 10px';
  bg.style.boxShadow = '0 4px 16px rgba(0,0,0,.24)';
  bg.style.color = '#f9fafb';
  bg.style.fontFamily = 'system-ui, sans-serif';
  bg.style.position = 'fixed';
  bg.style.top = '0';
  bg.style.right = '0';
  bg.style.padding = '8px 10px 8px 12px';
  bg.style.zIndex = '2147483646';

  const infoButton = document.createElement('button');
  infoButton.textContent = 'Details';
  infoButton.setAttribute('type', 'button');
  infoButton.setAttribute('aria-label', 'Show detection details');
  infoButton.title = 'Show detection details';
  styleButton(infoButton);
  infoButton.style.padding = '5px 9px';
  infoButton.style.fontSize = '12px';
  infoButton.onclick = () => showReportModal(report, tweet);
  bg.append(text, infoButton);

  return bg;
}
