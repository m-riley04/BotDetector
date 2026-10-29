import { getDecancer } from './decancer';

/**
 * Specifically carved-out checks for specific, stubborn characters that pass checks.
 * I went through most of the failing tests and hand-carved these out. Took over 2 hours for just this small list.
 */
const SPECIFIC_UTF_CHARACTER_MAPPING: Record<string, string> = {
  ᄃ: 'c',
  '🇨​​': 'c',
  ｃ: 'c',
  '𝒸': 'c',
  '¢': 'c',
  ፈ: 'c',
  ς: 'c',
  ƈ: 'c',
  '₵': 'C',
  匚: 'C',
  ᑕ: 'C',
  ᑢ: 'C',
  ｋ: 'k',
  ƙ: 'k',
  ҟ: 'k',
  Ќ: 'K',
  ᛕ: 'K',
  '₭': 'K',
  Ҝ: 'K',
  ズ: 'K',
  ᖽᐸ: 'K',
  к: 'K',
  Ꮶ: 'K',
  ҽ: 'e',
  '𝐞': 'e',
  '𝒆': 'e',
  乇: 'E',
  ᗴ: 'E',
  є: 'E',
  ɛ: 'E',
  '€': 'E',
  έ: 'E',
  ᘿ: 'E',
  Ɇ: 'E',
  Ꮛ: 'E',
  ɧ: 'h',
  ん: 'h',
  ｈ: 'h',
  հ: 'h',
  Ꮒ: 'h',
  ђ: 'h',
  Ⱨ: 'H',
  ᕼ: 'H',
  卄: 'H',
  Ħ: 'H',
  н: 'H',
  ｉ: 'i',
  เ: 'i',
  Ꭵ: 'i',
  '꠸': 'i', // could be J
  ᓰ: 'i',
  ι: 'i',
  丨: 'I',
  ı: 'I',
  ł: 'I',
  ﾉ: 'I',
  Ɨ: 'I',
  Ӏ: 'I',
  Ɩ: 'l',
  ᥣׁׅ֪: 'l',
  '𝔩': 'l',
  ｌ: 'l', // TODO: this font can almost certainly be found with an easier method
  ᒪ: 'L',
  ﾚ: 'L',
  ㄥ: 'L',
  ʟ: 'L',
  Ⱡ: 'L',
  г: 'r',
  ｒ: 'r',
  '᥅': 'r',
  尺: 'R',
  я: 'R',
  ᖇ: 'R',
  Ɽ: 'R',
  Ꮢ: 'R',
  ཞ: 'R',
  '░': '',
};

const SPECIFIC_CHARACTERS = Object.keys(SPECIFIC_UTF_CHARACTER_MAPPING);

function replaceSpecificUTFCharacters(s: string): string {
  let ret = s;
  // O(n) function. fix this.
  for (const c of SPECIFIC_CHARACTERS) {
    ret = ret.replaceAll(c, SPECIFIC_UTF_CHARACTER_MAPPING[c]);
  }
  return ret;
}

export function removeEmojis(s: string): string {
  return s.replace(/\p{RGI_Emoji}/gv, '');
}

/**
 * Maps fancy Unicode text (styled fonts, homoglyphs, zalgo, etc.) back to plain text with decancer.
 * Requires `loadDecancer()` to have finished first.
 * @param s
 * @returns
 */
export function normalizeUnicodeFancyText(s: string): string {
  if (s === '') return s; // decancer for whatever reason messes this up
  const cured = getDecancer()(replaceSpecificUTFCharacters(s));
  try {
    return cured.toString();
  } finally {
    // the cured string lives in WASM memory, which the JS garbage collector won't reclaim
    cured.free();
  }
}

/**
 * Detects whether the string contains fancy Unicode text.
 *
 * Math Symbols: U+1D400–U+1D7FF
 * Enclosed Alphanumerics: U+2460–U+24FF
 * Fullwidth ASCII Variants: U+FF01–U+FF5E
 *
 * @param s
 * @returns
 */
export function containsFancyUnicodeText(s: string): boolean {
  const emojiless = removeEmojis(s);
  const cleaned = normalizeUnicodeFancyText(emojiless);
  return cleaned.toLowerCase() !== emojiless.toLowerCase();
}
