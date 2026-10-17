import { BOT_ELEMENT } from '../common/constants';
import { BotDetectionReport } from './detection';

/**
 * Returns a color string based on the chance value.
 * TODO: make this more gradient-based
 * @param chance The chance value to determine the color. Between 0-1.
 * @returns A color string based on the chance value.
 */
export function getColorFromChance(chance: number): string {
  if (chance >= 0.9) {
    return 'red';
  } else if (chance >= 0.75) {
    return 'orange';
  } else if (chance >= 0.5) {
    return 'yellow';
  } else if (chance >= 0.25) {
    return 'lightgreen';
  }
  return 'green';
}

/**
 * Creates the tag element for displaying bot chance.
 * @param report The bot detection report containing the chance value.
 * @returns An HTML element representing the bot chance tag.
 */
export function createBotElement(report: BotDetectionReport): HTMLElement {
  const bg = document.createElement(BOT_ELEMENT);
  const text = document.createElement('p');

  text.textContent = `Bot Chance: ${report.chance * 100}%`;
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

  return bg;
}
