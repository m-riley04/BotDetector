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

const hasAbnormalRegionalIndicators = (s: string) =>
  /[\u{1F1E6}-\u{1F1FF}]{3,}/u.test(s);
const hasEnclosedAlphanumerics = (
  s: string,
  includeRegionalIndicators: boolean = true
) =>
  new RegExp(
    `[\u{2460}-\u{24FF}${includeRegionalIndicators ? '\u{1F100}-\u{1F1FF}' : '\u{1F100}-\u{1F1E5}'}]`,
    'u'
  ).test(s);
const hasPhoneticExtension = (s: string) =>
  /[\u{1D00}-\u{1D7F}\u{1D80}-\u{1DBF}]/u.test(s);
const hasHalfAndFullWidths = (s: string) => /[\u{FF00}-\u{FFEF}]/u.test(s);
const hasSupplamentalMathOps = (s: string) => /[\u{2A00}-\u{2AFF}]/u.test(s);
const hasMathAlphanumerics = (s: string) => /[\u{1D400}-\u{1D7FF}]/u.test(s);
const hasFont = (s: string) =>
  hasEnclosedAlphanumerics(s, false) ||
  (hasEnclosedAlphanumerics(s, true) && hasAbnormalRegionalIndicators(s)) || // the regional indicators need to be strange
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

const UNICODE_LANGUAGE_SCRIPTS = [
  'Adlam',
  'Ahom',
  'Anatolian_Hieroglyphs',
  'Arabic',
  'Armenian',
  'Avestan',
  'Balinese',
  'Bamum',
  'Bassa_Vah',
  'Batak',
  'Bengali',
  'Bhaiksuki',
  'Bopomofo',
  'Brahmi',
  'Buginese',
  'Buhid',
  'Canadian_Aboriginal',
  'Carian',
  'Caucasian_Albanian',
  'Chakma',
  'Cham',
  'Cherokee',
  'Chorasmian',
  'Coptic',
  'Cuneiform',
  'Cypriot',
  'Cypro_Minoan',
  'Cyrillic',
  'Deseret',
  'Devanagari',
  'Dives_Akuru',
  'Dogra',
  'Duployan',
  'Egyptian_Hieroglyphs',
  'Elbasan',
  'Elymaic',
  'Ethiopic',
  'Georgian',
  'Glagolitic',
  'Gothic',
  'Grantha',
  'Greek',
  'Gujarati',
  'Gunjala_Gondi',
  'Gurmukhi',
  'Han',
  'Hangul',
  'Hanifi_Rohingya',
  'Hanunoo',
  'Hatran',
  'Hebrew',
  'Hiragana',
  'Imperial_Aramaic',
  'Inscriptional_Pahlavi',
  'Inscriptional_Parthian',
  'Javanese',
  'Kaithi',
  'Kannada',
  'Katakana',
  'Kawi',
  'Kayah_Li',
  'Kharoshthi',
  'Khitan_Small_Script',
  'Khmer',
  'Khojki',
  'Khudawadi',
  'Lao',
  'Latin',
  'Lepcha',
  'Limbu',
  'Linear_A',
  'Linear_B',
  'Lisu',
  'Lycian',
  'Lydian',
  'Mahajani',
  'Makasar',
  'Malayalam',
  'Mandaic',
  'Manichaean',
  'Marchen',
  'Masaram_Gondi',
  'Medefaidrin',
  'Meetei_Mayek',
  'Mende_Kikakui',
  'Meroitic_Cursive',
  'Meroitic_Hieroglyphs',
  'Miao',
  'Modi',
  'Mongolian',
  'Mro',
  'Multani',
  'Myanmar',
  'Nabataean',
  'Nag_Mundari',
  'Nandinagari',
  'New_Tai_Lue',
  'Newa',
  'Nko',
  'Nushu',
  'Nyiakeng_Puachue_Hmong',
  'Ogham',
  'Ol_Chiki',
  'Old_Hungarian',
  'Old_Italic',
  'Old_North_Arabian',
  'Old_Permic',
  'Old_Persian',
  'Old_Sogdian',
  'Old_South_Arabian',
  'Old_Turkic',
  'Old_Uyghur',
  'Oriya',
  'Osage',
  'Osmanya',
  'Pahawh_Hmong',
  'Palmyrene',
  'Pau_Cin_Hau',
  'Phags_Pa',
  'Phoenician',
  'Psalter_Pahlavi',
  'Rejang',
  'Runic',
  'Samaritan',
  'Saurashtra',
  'Sharada',
  'Shavian',
  'Siddham',
  'SignWriting',
  'Sinhala',
  'Sogdian',
  'Sora_Sompeng',
  'Soyombo',
  'Sundanese',
  'Syloti_Nagri',
  'Syriac',
  'Tagalog',
  'Tagbanwa',
  'Tai_Le',
  'Tai_Tham',
  'Tai_Viet',
  'Takri',
  'Tamil',
  'Tangsa',
  'Tangut',
  'Telugu',
  'Thaana',
  'Thai',
  'Tibetan',
  'Tifinagh',
  'Tirhuta',
  'Toto',
  'Ugaritic',
  'Vai',
  'Vithkuqi',
  'Wancho',
  'Warang_Citi',
  'Yezidi',
  'Yi',
  'Zanabazar_Square',
] as const;
type UnicodeLanguageScriptKey = (typeof UNICODE_LANGUAGE_SCRIPTS)[number];

const hasAbnormalLanguageMixing = (s: string): boolean => {
  for (const lang of UNICODE_LANGUAGE_SCRIPTS) {
    const e = /\p{Script=Adlam}/v;
    const scriptLang = `{Script=${lang}}`;
    const query = `(\\p${scriptLang}\\P${scriptLang}\\p${scriptLang})|(\\P${scriptLang}\\p${scriptLang}\\P${scriptLang})|(\\p${scriptLang}\\P${scriptLang})|(\\P${scriptLang}\\p${scriptLang})+`;
    const exp = new RegExp(query, 'u');
    if (exp.test(s)) return true;
  }

  return false;
};

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
  languages: readonly UnicodeLanguageScriptKey[] = UNICODE_LANGUAGE_SCRIPTS,
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
  const hasMixedLanguages = hasAbnormalLanguageMixing(s);

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
