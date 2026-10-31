/**
 * @see https://jrgraphix.net/research/unicode_blocks.php
 * @see https://en.wikipedia.org/wiki/Unicode_block
 */

import {
  hasCanadianAboriginalSyllabics,
  hasCurrencySymbol,
  hasFont,
  hasLetterlike,
  hasYi,
  UNICODE_LANGUAGE_SCRIPTS,
  UnicodeLanguageScriptKey,
} from '../common/unicode';

// WARNING/TODO: just a thought I had: it would usually either be bots or scientific figures using these symbols.
// If I don't get this right, I feel as if it could be bad for the scientific community, as
// they might be mistakenly marked as "untrustworthy". That's the last thing we need rn.
// bleh.

/**
 * Scripts that legitimately appear together inside a single word.
 * A word mixing scripts from the same group is not considered abnormal.
 */
const COMPATIBLE_SCRIPT_GROUPS: readonly (readonly UnicodeLanguageScriptKey[])[] =
  [
    ['Han', 'Hiragana', 'Katakana'], // Japanese: kanji + kana, e.g. 食べる
  ];

const compatibleScriptsFor = (
  lang: UnicodeLanguageScriptKey
): readonly UnicodeLanguageScriptKey[] =>
  COMPATIBLE_SCRIPT_GROUPS.find((group) => group.includes(lang)) ?? [lang];

/**
 * Abnormal language mixing is defined as multiple scripts within single words.
 * @param s
 * @returns
 */
export const hasAbnormalLanguageMixing = (s: string): boolean => {
  const words = s.split(/[\s,./()—!?:;…«»"\p{Pd}]|\\t|-/u);

  for (const word of words) {
    const cleanWord = word.replace(
      /[\p{Punctuation}\p{Symbol}\p{RGI_Emoji}\p{Script=Common}\p{Script=Inherited}\d]/gv,
      ''
    );

    // constant size
    for (const lang of UNICODE_LANGUAGE_SCRIPTS) {
      const scriptLang = `\\p{Script=${lang}}`;
      // "Not this script" excludes compatible scripts too, so Han next to Hiragana isn't a mismatch.
      const compatible = compatibleScriptsFor(lang)
        .map((l) => `\\p{Script=${l}}`)
        .join('');
      const scriptNotLang = `[^${compatible}]`;
      const query = `(${scriptLang}.*${scriptNotLang}+.*)|(${scriptNotLang}.*${scriptLang}+.*)`;
      const exp = new RegExp(query, 'u');
      if (exp.test(cleanWord)) return true;
    }
  }

  return false;
};

/**
 * Checks text for artistic/design decorators that would never naturally be there.
 * I.e. blocks, boxes, circles, etc.
 * @param s
 */
export function hasArtisticDecorators(s: string): boolean {
  return /[\u{2500}-\u{25FF}]/u.test(s); // includes box drawing, block elements, and geometric shapes
}

/**
 *
 * Fancy text is (currently) defined as text that uses non-standard characters to convey a message in English.
 * @param s
 * @returns
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Unicode_character_class_escape
 * @see https://tc39.es/ecma262/multipage/text-processing.html#table-nonbinary-unicode-properties
 */
export function isFancyText(s: string): boolean {
  const n = s.normalize('NFD');

  const hasMixedLanguages = hasAbnormalLanguageMixing(s);

  const hasCommonConfusingSymbols = hasCurrencySymbol(n) || hasLetterlike(n);

  // this has a high chance of false positives, but can be easily used to trick.
  // TODO: Maybe have it be it's own check with a lower weight?
  const hasLookalikeLanguage = hasYi(n) || hasCanadianAboriginalSyllabics(n);

  return (
    hasMixedLanguages ||
    hasFont(n) ||
    hasCommonConfusingSymbols ||
    hasLookalikeLanguage ||
    hasArtisticDecorators(s) // TODO: this might cause false positives. Maybe separate out into it's own weaker check?
  );
}
