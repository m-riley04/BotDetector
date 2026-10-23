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
