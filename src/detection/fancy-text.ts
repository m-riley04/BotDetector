/**
 *
 * Fancy text is (currently) defined as text that uses non-standard characters to convey a message in English.
 * @param s
 * @returns
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Unicode_character_class_escape
 * @see https://tc39.es/ecma262/multipage/text-processing.html#table-nonbinary-unicode-properties
 * @see https://jrgraphix.net/research/unicode_blocks.php
 */
export function isFancyText(s?: string): boolean {
  if (!s || s === '') return false;

  const hasLatin = /\p{Script=Latin}/u.test(s);

  // A mix of Cyrillic and Latin characters is sus.
  const hasCyrillic = /\p{Script=Cyrillic}/u.test(s);

  // mixing Japanese/Chinese characters and English might
  const hasJapaneseChinese = false; // /[\p{Hiragana}\p{Katakana}\p{Han}ー]/u.test(s);

  const hasGreekCoptic = /\u{0370}-\u{03FF}/u.test(s);

  const isPhoneticExtension = /\u{1D00}-\u{1D7F}/u.test(s);

  const hasFont = /\u{1D400}-\u{1D7FF}/u.test(s);

  return (
    (hasLatin && hasCyrillic) ||
    (hasLatin && hasJapaneseChinese) ||
    (hasLatin && hasGreekCoptic) ||
    hasFont
  );
}
