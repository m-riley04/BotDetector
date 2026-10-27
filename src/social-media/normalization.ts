/**
 * Specifically carved-out checks for specific, stubborn characters that pass checks.
 */
const SPECIFIC_UTF_CHARACTER_MAPPING: Record<string, string> = {
  ᄃ: 'c',
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
  ᓰ: 'i',
  ι: 'i',
  丨: 'I',
  ı: 'I',
  ł: 'I',
  ﾉ: 'I',
  Ɨ: 'I',
  Ӏ: 'I',
  Ɩ: 'l',
  '𝔩': 'l',
  ｌ: 'l', // TODO: this font can almost certainly be found with an easier method
  ᒪ: 'L',
  ﾚ: 'L',
  ㄥ: 'L',
  ʟ: 'L',
  Ⱡ: 'L',
  г: 'r',
  ｒ: 'r',
  尺: 'R',
  я: 'R',
  ᖇ: 'R',
  Ɽ: 'R',
  Ꮢ: 'R',
  ཞ: 'R',
  '░': ' ',
};

const SPECIFIC_CHARACTERS = Object.keys(SPECIFIC_UTF_CHARACTER_MAPPING);

export function removeNonAsciiCharacters(s: string): string {
  return s.replace(/[\s\S]/g, (character) =>
    character.charCodeAt(0) <= 0x7f ? character : ''
  );
}

export function removeNonLatinSymbols(
  s: string,
  keepPunctuation: boolean = false
): string {
  return keepPunctuation
    ? s.replace(/\p{L}(?<!\p{Script=Latin})/gu, '')
    : s.replace(/[^\p{Script=Latin}]/gu, '');
}

export function removeCombinedTextAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function replaceSpecificUTFCharacters(s: string): string {
  let ret = s;
  // very long function. fix this.
  for (const c of SPECIFIC_CHARACTERS) {
    ret = ret.replaceAll(c, SPECIFIC_UTF_CHARACTER_MAPPING[c]);
  }
  return ret;
}

/**
 * Normalizes with NFKD to normalize UTF fonts/styling.
 * @param s
 * @returns
 */
export function normalizeUnicodeFancyText(s: string): string {
  return removeNonAsciiCharacters(
    removeCombinedTextAccents(replaceSpecificUTFCharacters(s).normalize('NFKD'))
  );
}

/**
 * Detects whether the string contains fancy Unicode text.
 * Math Symbols: U+1D400–U+1D7FF
 * Enclosed Alphanumerics: U+2460–U+24FF
 * Fullwidth ASCII Variants: U+FF01–U+FF5E
 * @param s
 * @returns
 */
export function containsFancyUnicodeText(s: string): boolean {
  const cleaned = normalizeUnicodeFancyText(s);
  return cleaned !== s;
  //   const fancyRegex = /[\u1D400-\u1D7FF\u2460-\u24FF\uFF01-\uFF5E]/u;
  //   return fancyRegex.test(s);
}
