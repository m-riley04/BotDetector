export const UNICODE_LANGUAGE_SCRIPTS = [
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
export type UnicodeLanguageScriptKey =
  (typeof UNICODE_LANGUAGE_SCRIPTS)[number];

// region language
export const hasYi = (s: string) => /\p{Script=Yi}/u.test(s);
export const hasCanadianAboriginalSyllabics = (s: string) =>
  /\p{Script=Canadian_Aboriginal}/u.test(s);

// region font-like
/**
 * Real flags are pairs of regional indicators (🇺🇦 = 🇺 + 🇦), so strip valid flag sequences first;
 * any indicator left over is being used as a letter (e.g. "🇨 🇱 🇮 🇨 🇰").
 */
export const hasAbnormalRegionalIndicators = (s: string) =>
  /[\u{1F1E6}-\u{1F1FF}]/u.test(s.replace(/\p{RGI_Emoji_Flag_Sequence}/gv, ''));
export const hasEnclosedAlphanumerics = (
  s: string,
  includeRegionalIndicators: boolean = true
) =>
  new RegExp(
    `[\u{2460}-\u{24FF}${includeRegionalIndicators ? '\u{1F100}-\u{1F1FF}' : '\u{1F100}-\u{1F1E5}'}]`,
    'u'
  ).test(s);
export const hasPhoneticExtension = (s: string) =>
  /[\u{1D00}-\u{1D7F}\u{1D80}-\u{1DBF}]/u.test(s);
export const hasHalfAndFullWidths = (s: string) =>
  /[\u{FF00}-\u{FFEF}]/u.test(s);
export const hasSupplamentalMathOps = (s: string) =>
  /[\u{2A00}-\u{2AFF}]/u.test(s);
export const hasMathAlphanumerics = (s: string) =>
  /[\u{1D400}-\u{1D7FF}]/u.test(s);
export const hasFont = (s: string) =>
  hasEnclosedAlphanumerics(s, false) ||
  (hasEnclosedAlphanumerics(s, true) && hasAbnormalRegionalIndicators(s)) || // the regional indicators need to be strange
  hasHalfAndFullWidths(s) ||
  hasSupplamentalMathOps(s) ||
  hasMathAlphanumerics(s) ||
  hasPhoneticExtension(s);

// region confusables
/**
 * Letterlike Symbols block, minus legal marks people actually use: ℗ (U+2117), ℠ (U+2120), ™ (U+2122).
 * (© and ® live in Latin-1, outside this block, so they never matched.)
 */
export const hasLetterlike = (s: string) =>
  /[[\u{2100}-\u{214F}]--[\u{2117}\u{2120}\u{2122}]]/v.test(s);
export const hasCurrencySymbol = (s: string) => /\p{Sc}/u.test(s);

// region other
