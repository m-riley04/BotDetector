/**
 * @see https://jrgraphix.net/research/unicode_blocks.php
 * @see https://en.wikipedia.org/wiki/Unicode_block
 */

// region helpers

const hasLatin = (s: string) => /\p{Script=Latin}/u.test(s);
//const hasAnyNotLatin = (s: string) => /\P{Script=Latin}/u.test(s);
//const hasCommons = (s: string) => /\p{Script=Common}/u.test(s);
const hasCyrillic = (s: string) => /\p{Script=Cyrillic}/u.test(s);
const hasGreek = (s: string) => /\p{Script=Greek}/u.test(s);
const hasCoptic = (s: string) => /\p{Script=Coptic}/u.test(s);
const hasArabic = (s: string) => /\p{Script=Arabic}/u.test(s);
const hasBopomofo = (s: string) => /\p{Script=Bopomofo}/u.test(s);
const hasHan = (s: string) => /\p{Script=Han}/u.test(s);
const hasHiragana = (s: string) => /\p{Script=Hiragana}/u.test(s);
const hasKatakana = (s: string) => /\p{Script=Katakana}/u.test(s);
const hasJapanese = (s: string) => hasHiragana(s) || hasKatakana(s);
const hasHangul = (s: string) => /\p{Script=Hangul}/u.test(s);
const hasTibetan = (s: string) => /\p{Script=Tibetan}/u.test(s);
const hasRunic = (s: string) => /\p{Script=Runic}/u.test(s);
const hasEthiopic = (s: string) => /\p{Script=Ethiopic}/u.test(s);
const hasCherokee = (s: string) => /\p{Script=Cherokee}/u.test(s);
const hasYi = (s: string) => /\p{Script=Yi}/u.test(s);
const hasTagalog = (s: string) => /\p{Script=Tagalog}/u.test(s);
//const hasCJK = (s: string) => /[\u{4E00}-\u{9FFF}]/u.test(s);
const hasTagbanwa = (s: string) => /\p{Script=Tagbanwa}/u.test(s);
const hasHebrew = (s: string) => /\p{Script=Hebrew}/u.test(s);
const hasSyriac = (s: string) => /\p{Script=Syriac}/u.test(s);

const hasCanadianAboriginalSyllabics = (s: string) =>
  /\p{Script=Canadian_Aboriginal}/u.test(s);

// const hasRegionalIndicators = (s: string) => ⓒⓛⓘⓒⓚ ⓗⓔⓡⓔ 🅲🅻🅸🅲🅺 🅷🅴🆁🅴"

const hasPhoneticExtension = (s: string) =>
  /[\u{1D00}-\u{1D7F}\u{1D80}-\u{1DBF}]/u.test(s);
const hasEnclosedAlphanumerics = (s: string) =>
  /[\u{2460}-\u{24FF}\u{1F100}-\u{1F1FF}]/u.test(s);
const hasHalfAndFullWidths = (s: string) => /[\u{FF00}-\u{FFEF}]/u.test(s);
const hasSupplamentalMathOps = (s: string) => /[\u{2A00}-\u{2AFF}]/u.test(s);
const hasMathAlphanumerics = (s: string) => /[\u{1D400}-\u{1D7FF}]/u.test(s);
const hasFont = (s: string) =>
  hasEnclosedAlphanumerics(s) ||
  hasHalfAndFullWidths(s) ||
  hasSupplamentalMathOps(s) ||
  hasMathAlphanumerics(s) ||
  hasPhoneticExtension(s);

const hasLetterlike = (s: string) => /[\u{2100}-\u{214F}]/u.test(s);
const hasCurrencySymbol = (s: string) => /\p{Sc}/u.test(s);

// WARNING/TODO: just a thought I had: it would usually either be bots or scientific figures using these symbols.
// If I don't get this right, I feel as if it could be bad for the scientific community, as
// they might be mistakenly marked as "untrustworthy". That's the last thing we need rn.
// bleh.

/**
 *
 * Fancy text is (currently) defined as text that uses non-standard characters to convey a message in English.
 * @param s
 * @returns
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Unicode_character_class_escape
 * @see https://tc39.es/ecma262/multipage/text-processing.html#table-nonbinary-unicode-properties
 */
export function isFancyText(
  s: string,
  maxAllowedMixedLanguages: number = 2
): boolean {
  // TODO: lock this unicode range down
  const n = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // TODO: maybe making this a loop of strings would be better than all the helper regex I have?
  const langs = [
    hasLatin(n),
    hasCyrillic(n),
    hasJapanese(n),
    hasHan(n),
    hasBopomofo(n),
    hasGreek(n),
    hasCoptic(n),
    hasHangul(n),
    hasArabic(n),
    hasTibetan(n),
    hasRunic(n),
    hasEthiopic(n),
    hasCherokee(n),
    hasYi(n),
    hasTagalog(n),
    hasTagbanwa(n),
    hasHebrew(n),
    hasSyriac(n),
  ];
  const hasMixedLanguages =
    langs.filter((l) => l === true).length >= maxAllowedMixedLanguages;

  const hasCommonConfusingSymbols = hasCurrencySymbol(n) || hasLetterlike(n);

  // this has a high chance of false positives, but can be easily used to trick.
  // TODO: Maybe have it be it's own check with a lower weight?
  const hasLookalikeLanguage = hasYi(n) || hasCanadianAboriginalSyllabics(n);

  // TODO: get this data
  const hasExtremelyRareCharacters = false;

  return (
    hasMixedLanguages ||
    hasFont(n) ||
    hasCommonConfusingSymbols ||
    hasExtremelyRareCharacters ||
    hasLookalikeLanguage ||
    hasArtisticDecorators(s) // TODO: this might cause false positives. Maybe separate out into it's own weaker check?
  );
}

/**
 * Checks text for artistic/design decorators that would never naturally be there.
 * I.e. blocks, boxes, circles, etc.
 * @param s
 */
export function hasArtisticDecorators(s: string): boolean {
  return /[\u{2500}-\u{25FF}]/u.test(s); // includes box drawing, block elements, and geometric shapes
}
