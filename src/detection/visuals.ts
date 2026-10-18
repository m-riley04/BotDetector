import { BOT_ELEMENT } from '../common/constants';
import { BOT_THRESHOLD, BotDetectionReport } from './detection';

const pct = (n: number) => `${Number((n * 100).toFixed(2))}%`;

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
export function showReportModal(report: BotDetectionReport): void {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,.5)';
  overlay.style.zIndex = '100000';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  const panel = document.createElement('div');
  panel.style.background = '#fff';
  panel.style.color = '#111';
  panel.style.font = '14px sans-serif';
  panel.style.borderRadius = '8px';
  panel.style.padding = '16px';
  panel.style.maxWidth = '520px';
  panel.style.maxHeight = '80vh';
  panel.style.overflow = 'auto';
  panel.style.font = '14px sans-serif';

  const title = document.createElement('h3');
  title.textContent = `Bot Chance: ${pct(report.chance)} | ${
    report.isBot ? 'Likely a bot' : 'Probably not a bot'
  }`;
  title.style.margin = '0 0 8px';
  panel.append(title);

  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';
  table.style.width = '100%';
  table.append(row(['Check', 'Weight', 'Added', 'Total'], 'font-weight:bold;'));

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
        c.triggered ? 'background:#fde8e8;' : 'color:#888;'
      )
    );
  }
  table.append(
    row(
      ['Final (capped at 100%)', '', '', pct(report.chance)],
      'font-weight:bold;border-top:2px solid #111;'
    )
  );
  panel.append(table);

  const note = document.createElement('p');
  note.textContent = `Marked as a bot at ${pct(BOT_THRESHOLD)} or higher.`;
  note.style.margin = '8px 0';
  note.style.color = '#555';
  panel.append(note);

  const close = document.createElement('button');
  close.textContent = 'Close';
  close.onclick = () => overlay.remove();
  panel.append(close);

  overlay.append(panel);
  document.body.append(overlay);
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
export function createBotElement(report: BotDetectionReport): HTMLElement {
  const bg = document.createElement(BOT_ELEMENT);
  const text = document.createElement('p');

  text.textContent = `Bot Chance: ${Number((report.chance * 100).toFixed(2))}%`;
  text.style.mixBlendMode = 'difference';
  text.style.lineHeight = '0';

  bg.append(text);

  bg.style.backgroundColor = getColorFromChance(report.chance);
  bg.style.color = 'white';
  bg.style.position = 'fixed';
  bg.style.top = '0';
  bg.style.right = '0';
  bg.style.padding = '5px';
  bg.style.zIndex = '1000';

  // info button to see results of the bot detection report
  const button = document.createElement('button');
  button.textContent = 'i';
  button.style.marginLeft = '5px';
  button.style.width = '20px';
  button.style.height = '20px';
  button.onclick = () => showReportModal(report);
  bg.append(button);

  return bg;
}
