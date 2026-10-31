import {
  hasAbnormalLanguageMixing,
  isFancyText,
} from '../src/detection/fancy-text';
import { normalizeUnicodeFancyText } from '../src/social-media/normalization';

// made these by hand using both lingojam.com and inputoutput.dev: https://lingojam.com/FancyTextGenerator https://inputoutput.dev/unicode-fancy-font-generator/
const CLICK_HERE_FANCY_VARIATIONS = [
  '𝔠𝔩𝔦𝔠𝔨 𝔥𝔢𝔯𝔢',
  '𝖈𝖑𝖎𝖈𝖐 𝖍𝖊𝖗𝖊',
  '𝚌𝚕𝚒𝚌𝚔 𝚑𝚎𝚛𝚎',
  '𝕔𝕝𝕚𝕔𝕜 𝕙𝕖𝕣𝕖',
  '𝒸𝓁𝒾𝒸𝓀 𝒽ℯ𝓇ℯ',
  '𝓬𝓵𝓲𝓬𝓴 𝓱𝓮𝓻𝓮',
  '𝐂𝐋𝐈𝐂𝐊 𝐇𝐄𝐑𝐄',
  '𝑐𝑙𝑖𝑐𝑘 ℎ𝑒𝑟𝑒',
  '𝒄𝒍𝒊𝒄𝒌 ℎ𝒆𝒓𝒆',
  '𝖼𝗅𝗂𝖼𝗄 𝗁𝖾𝗋𝖾',
  '𝗰𝗹𝗶𝗰𝗸 𝗵𝗲𝗿𝗲',
  '𝘤𝘭𝘪𝘤𝘬 𝘩𝘦𝘳𝘦',
  '𝙘𝙡𝙞𝙘𝙠 𝙝𝙚𝙧𝙚',
  '🅒🅛🅘🅒🅚 🅗🅔🅡🅔',
  '🄲🄻🄸🄲🄺 🄷🄴🅁🄴',
  '⒞⒧⒤⒞⒦ ⒣⒠⒭⒠',
  'ｃｌｉｃｋ ｈｅｒｅ',
  'ᴄʟɪᴄᴋ ʜᴇʀᴇ',
  'ᶜˡᶦᶜᵏ ʰᵉʳᵉ',
  '💎👺  ⒸⓛⓘⒸⓚ ⓗ𝕖ʳ乇  🔥👻',
  'ᥴꪶ꠸ᥴᛕ ꫝꫀ᥅ꫀ',
  'ᝯׁᥣׁׅ֪ꪱׁׅᝯׁƙׁׅ֑ hׁׅ֮ꫀׁׅܻꭈׁׅꫀׁׅܻ',
  'ꉓ꒒ꀤꉓꀘ ꃅꍟꋪꍟ',
  '••.•´¯`•.••   🎀  𝒸𝓁𝒾𝒸𝓀 𝒽𝑒𝓇𝑒  🎀   ••.•`¯´•.••',
  'ᴄʟɪᴄᴋ ʜᴇʀᴇ',
  '🅲🅻🅸🅲🅺 🅷🅴🆁🅴',
  'cₗᵢcₖ ₕₑᵣₑ',
  'ᶜˡⁱᶜᵏ ʰᵉʳᵉ',
  'ⓒⓛⓘⓒⓚ ⓗⓔⓡⓔ',
  'ςɭเςк ђєгє',
  'ƈʅιƈƙ ԋҽɾҽ',
  'ƈʟɨƈӄ ɦɛʀɛ',
  'ፈᏝᎥፈᏦ ᏂᏋᏒᏋ',
  'ƈƖıƈƙ ɧɛཞɛ',
  '¢li¢k hērē',
  '𝐜𝐥𝐢𝐜𝐤 𝐡𝐞𝐫𝐞',
  '𝗰𝗹𝗶𝗰𝗸 𝗵𝗲𝗿𝗲',
  '𝘤𝘭𝘪𝘤𝘬 𝘩𝘦𝘳𝘦',
  '𝙘𝙡𝙞𝙘𝙠 𝙝𝙚𝙧𝙚',
  '𝚌𝚕𝚒𝚌𝚔 𝚑𝚎𝚛𝚎',
  'ᄃᄂIᄃK ΉΣЯΣ',
  '¢ℓι¢к нєяє',
  '¢lï¢k hêrê',
  '₵Ⱡł₵₭ ⱧɆⱤɆ',
  '匚ㄥ丨匚Ҝ 卄乇尺乇',
  'ᄃﾚﾉᄃズ ん乇尺乇',
  '░c░l░i░c░k░ ░h░e░r░e░',
  '(っ◔◡◔)っ ♥ click here ♥',
  '【﻿ｃｌｉｃｋ　ｈｅｒｅ】',
  //'˜”*°•.˜”*°• click here •°*”˜.•°*”˜',
  'c҉l҉i҉c҉k҉ ҉h҉e҉r҉e҉',
  'ᑕᒪIᑕK ᕼEᖇE',
  'ᑢᒪᓰᑢᖽᐸ ᕼᘿᖇᘿ',
  '🍇 ⋆ 🍓  🎀  𝒸𝓁𝒾𝒸𝓀 𝒽𝑒𝓇𝑒  🎀  🍓 ⋆ 🍇',
  'ıllıllı   🎀  𝒸𝓁𝒾𝒸𝓀 𝒽𝑒𝓇𝑒  🎀   ıllıllı',
  '🐔 ⋆ 🐸  🎀  𝒸𝓁𝒾𝒸𝓀 𝒽𝑒𝓇𝑒  🎀  🐸 ⋆ 🐔',
  '🐡  🎀  𝒸𝓁𝒾𝒸𝓀 𝒽𝑒𝓇𝑒  🎀  🐡',
  '🍑 ⋆ 🍇  🎀  𝒸𝓁𝒾𝒸𝓀 𝒽𝑒𝓇𝑒  🎀  🍇 ⋆ 🍑',
  '💥💥  ℂˡ𝓘ⓒ𝔨 Ｈєｒє  ♖👺',
  '¸„.-•~¹°”ˆ˜¨ 𝓒𝓁เ℃𝓀 𝔥𝐞ℝ乇 ¨˜ˆ”°¹~•-.„¸',
  '✎☝  𝐜𝓵ＩＣҜ ℍ𝕖гＥ  😳🐚',
  '.•♫•♬• ςｌĮ¢Ⓚ ｈ𝑒𝐑𝐞 •♬•♫•.',
  '☹✎  ⓒĹ𝐈℃Ⓚ Ħ𝐞ᖇⒺ  🍬♦',
  '✌🐻  ⒸℓƗℂ𝓚 Ｈⓔяє  🐠♥',
  '(¯´•._.• 𝒸𝐋ｉς𝕂 𝒽ⓔⓡᗴ •._.•´¯)',
  '♬🐒  𝐜ℓⒾςｋ ĤⒺⓡ𝐞  ♗💚',
  '╰☆☆ Č𝓛Įⓒⓚ 𝔥𝔢гє ☆☆╮',
  '╰☆☆ Čℓ𝓲𝐜𝐊 нᵉ𝓇𝐞 ☆☆╮',
  '♔👽  ｃℓⒾＣķ Ⓗ𝐄𝐫έ  ☹🌷',
  '🐍✌  ᑕ𝐥𝐈𝐜ᛕ ђ𝓔ℝ€  💀🐊',
  '🍔💙  ｃĹƗ𝒸Ќ Ĥєⓡ𝓔  ♔💛',
  '😲♨  ℃Ⓛ𝒾𝒸ⓚ Ｈ乇яє  ♔☆',
  '◦•●◉✿ c𝕝เ𝓬ⓚ ℍ𝒆Ř𝒆 ✿◉●•◦',
  '💚🍧  ℃𝓵𝓘¢ᛕ ＨєŘ𝒆  ♘♣',
  '🏆😎  ℂˡĮςЌ ⓗ𝑒ʳᗴ  ♕☆',
  '😝😂  𝐂𝐋Ｉℂ𝓚 Ħ𝑒ｒⓔ  🐉♗',
  '👽🎅  𝓬𝕝𝐈𝓒Ｋ 卄ẸⓇ𝔢  ♚💙',
  '😝🐤  ¢𝔩Ɨ𝓒ｋ 𝓱ᗴя𝒆  💥🐨',
  '🍉 ⋆ 🍦  🎀  𝒸𝓁𝒾𝒸𝓀 𝒽𝑒𝓇𝑒  🎀  🍦 ⋆ 🍉',
  '🐚 ⋆ 🐸  🎀  𝒸𝓁𝒾𝒸𝓀 𝒽𝑒𝓇𝑒  🎀  🐸 ⋆ 🐚',
  '🐏  🎀  𝒸𝓁𝒾𝒸𝓀 𝒽𝑒𝓇𝑒  🎀  🐏',
];

const _CLICK_HERE_FANCY_VARIATIONS_ACCENTS = [
  'c̴̢͑̀l̶͕̎̐̑́͒̇͝i̵͓͇̫̬̼̻͔̰̜̒c̴̮̦̲̙̗̜͓̼̑k̵͔͍̼͖͈̯̥̣̐̊̀̈̚͝ ̴̧̢̡̩̙̱̗͍̯̐̂̃͝ͅh̸͙̺͓̟̽̃̽͝͝e̴̯̦̞͎̫̘̳͔͛̄͑̿ͅr̷̖̒͋̚e̴̥̫̗͎͓̋̓͝',
  'c̶l̶i̶c̶k̶ ̶h̶e̶r̶e̶',
  'c̴l̴i̴c̴k̴ ̴h̴e̴r̴e̴',
  'c̷l̷i̷c̷k̷ ̷h̷e̷r̷e̷',
  'c̲l̲i̲c̲k̲ ̲h̲e̲r̲e̲',
  'c̳l̳i̳c̳k̳ ̳h̳e̳r̳e̳',
  'c̾l̾i̾c̾k̾ ̾h̾e̾r̾e̾',
  'c͎l͎i͎c͎k͎ ͎h͎e͎r͎e͎',
  'c͓̽l͓̽i͓̽c͓̽k͓̽ ͓̽h͓̽e͓̽r͓̽e͓̽',
];

/**
 * fancy variations that are verrrry persistent.
 */
const _CLICK_HERE_FANCY_VARIATIONS_TRICKY = [
  '🇨 🇱 🇮 🇨 🇰  🇭 🇪 🇷 🇪 ',
  'ǝɹǝɥ ʞɔılɔ',
  'c⃣   l⃣   i⃣   c⃣   k⃣    h⃣   e⃣   r⃣   e⃣',
  '​🇨​​🇱​​🇮​​🇨​​🇰​ ​🇭​​🇪​​🇷​​🇪​',
  'c⃞    l⃞    i⃞    c⃞    k⃞     h⃞    e⃞    r⃞    e⃞',
  '【c】【l】【i】【c】【k】 【h】【e】【r】【e】',
  '『c』『l』『i』『c』『k』 『h』『e』『r』『e』',
  '≋c≋l≋i≋c≋k≋ ≋h≋e≋r≋e≋',
  '[̲̅c][̲̅l][̲̅i][̲̅c][̲̅k] [̲̅h][̲̅e][̲̅r][̲̅e]',
  'c♥l♥i♥c♥k♥ ♥h♥e♥r♥e',
  //'çӀìçҟ հҽɾҽ', // the 'I' character is too similar to 'I' to be perceived as 'l'
  //'♍︎●︎♓︎♍︎🙵 ♒︎♏︎❒︎♏︎', // probs dont need to check for gaster here lol
  //'§.•´¨'°÷•..× 𝒸𝓁ιＣⓚ ｈєⓇ𝐞 ×,.•´¨'°÷•..§', // this one throws eslint errors lol
  //'ɔlᴉɔʞ ɥǝɹǝ', // also not readable enough to be worth it
  //'✧﹅ഒ✧⌯ ⋈⋆ǂ⋆', // this doesn't even look like it
  //'ɘɿɘʜ ʞɔi|ɔ', // backwards text isn't readable enough to be worth testing and the trouble
];

const NORMAL_TEXT = [
  'Hello World!',
  'click here ->',
  ';-;',
  'waow :o',
  'whomstve',
  'roflmao',
  'hey there',
  'h',
  '',
  'Wassup!.>;',
  'Text Me Here ~',
  'click me',
];

// Ordinary text real people put in names/bios/posts. None of these should count as "fancy".

const EMOJI_TEXT = [
  'Sarah 🌸',
  'Proud dad 👨‍👩‍👧', // ZWJ sequence
  'USA 🇺🇸', // flag (regional indicators)
  'she/her 🏳️‍🌈', // variation selector + ZWJ
  'Love ❤️', // variation selector
  'thumbs 👍🏽', // skin-tone modifier
  'call 1️⃣', // keycap
  '✨ vibes ✨',
  'NYC 📍',
  'College educated voter™️ | aspiring white collar professional | he/him 🇵🇸🇺🇦',
];

const PUNCTUATION_TEXT = [
  'it’s “quoted”',
  '10–20 — ok',
  'wait…',
  'a • b',
  'Go →',
  '½ price',
  '50°F',
  'Acme™', // trademark
  'Acme Delivery℠', // service mark
  'Album ℗ 2024', // sound recording copyright
  '© 2024 Acme', // copyright
  'Acme®', // registered
];

const NON_ENGLISH_TEXT = [
  'José',
  'Zoë',
  'Straße',
  'İstanbul',
  'Привет',
  '日本語',
  'مرحبا',
  'Ἀθῆναι',
  'José García 🇲🇽',
  'Papá de dos 👨‍👧‍👦 • Fan del fútbol',
  'Ciudad de México',
  'Can’t wait for the game this weekend… ⚽🔥',
];

describe('fancy unicode detection', () => {
  test.each(CLICK_HERE_FANCY_VARIATIONS)(
    'isFancyText detects fancy text "%s"',
    (s) => {
      expect(isFancyText(s)).toBe(true);
    }
  );

  // test.each(_CLICK_HERE_FANCY_VARIATIONS_ACCENTS)(
  //   'isFancyText detects fancy text with accents "%s"',
  //   (s) => {
  //     expect(isFancyText(s)).toBe(true);
  //   }
  // );

  // test.each(_CLICK_HERE_FANCY_VARIATIONS_TRICKY)(
  //   'isFancyText detects fancy text that are verrrrry tricky "%s"',
  //   (s) => {
  //     expect(isFancyText(s)).toBe(true);
  //   }
  // );

  test.each(NORMAL_TEXT)(
    'isFancyText does not detect fancy text on "%s"',
    (s) => {
      expect(isFancyText(s)).toBe(false);
    }
  );

  test.each(EMOJI_TEXT)('isFancyText ignores emoji in "%s"', (s) => {
    expect(isFancyText(s)).toBe(false);
  });

  test.each(PUNCTUATION_TEXT)(
    'isFancyText ignores typographic punctuation in "%s"',
    (s) => {
      expect(isFancyText(s)).toBe(false);
    }
  );

  test.each(NON_ENGLISH_TEXT)(
    'isFancyText ignores real non-English text "%s"',
    (s) => {
      expect(isFancyText(s)).toBe(false);
    }
  );
});

// Invisible / look-alike characters are written as escapes so the test names show what's actually there.
const MIXED_SCRIPT_WORDS = [
  'hеllo world', // Cyrillic 'е' inside a Latin word
  'pаypal login', // Cyrillic 'а' (classic phishing homoglyph)
  'Apрle support', // Cyrillic 'р'
  'οk', // Greek omicron + Latin 'k'
  'іt works', // Cyrillic 'і' + Latin 't'
  'clіck here!', // homoglyph with trailing punctuation
  'free mоney', // Cyrillic 'о'
  'Пpивет', // "Привет" with a Latin 'p' in it
  '日本go', // Han + Latin in one word
  'テストtest', // Katakana + Latin in one word
  'h​еllo', // zero-width space hiding inside the word
  'h‍еllo', // zero-width joiner hiding inside the word
  'pаy-pal', // hyphen split still leaves a mixed half
];

const SAME_SCRIPT_WORDS = [
  'hello world',
  '第1 你好!', // digit + punctuation attached to Han words
  '食べる', // Japanese: Han + Hiragana in one word is normal
  'コーヒー', // 'ー' (U+30FC) is Script=Common, not Katakana
  'café', // NFD 'café': 'e' + combining acute (Script=Inherited)
  'Привет,hello', // punctuation separates words, it doesn't join them
  'hi\tпривет', // tab is whitespace
  '你好　世界', // U+3000 ideographic space
  '', // empty string
  'hello\nмир', // newline is whitespace
  'hello мир', // non-breaking space
  'Привет мир',
  'مرحبا بالعالم',
  'हिन्दी', // Devanagari vowel signs are Script=Devanagari
  'naïve Straße İstanbul', // precomposed Latin letters
  'Ἀθῆναι', // precomposed Greek with diacritics
  'カタカナとひらがな', // Katakana + Hiragana
  '東京タワー', // Han + Katakana + 'ー'
  '2024年', // digits + Han
  'C++ and C#',
  'emoji😀test', // emoji inside a word is removed, not a script
];

// Punctuation that should separate words rather than glue them together.
const PUNCTUATION_SEPARATED_WORDS = [
  'Привет—hello', // em dash
  'Привет/hello',
  'hello.Мир',
  'Привет(hello)',
  'Привет!hello',
  'Привет?hello',
  'Привет:hello',
  'Привет;hello',
  'Привет…hello', // ellipsis character
  '«Привет»hello', // guillemets
  'Привет"hello"',
];

// Ordinary words with mid-word punctuation. These should never flag, whatever counts as a separator.
const MID_WORD_PUNCTUATION = [
  "don't",
  "rock'n'roll",
  'e-mail',
  'U.S.A.',
  '   ',
];

// Mixed scripts that this function can't see, but isFancyText as a whole should still catch.
const MIXED_SCRIPTS_FOR_OTHER_CHECKS = [
  '\u{1d421}еllo', // math-bold 'h' is Script=Common, so it's stripped before the script check
];

describe('abnormal language mixing within a word', () => {
  test.each(MIXED_SCRIPT_WORDS)('detects mixed scripts in %j', (s) => {
    expect(hasAbnormalLanguageMixing(s)).toBe(true);
  });

  test.each(SAME_SCRIPT_WORDS)('does not flag %j', (s) => {
    expect(hasAbnormalLanguageMixing(s)).toBe(false);
  });

  test.each(PUNCTUATION_SEPARATED_WORDS)(
    'treats punctuation as a word boundary in %j',
    (s) => {
      expect(hasAbnormalLanguageMixing(s)).toBe(false);
    }
  );

  test.each(MID_WORD_PUNCTUATION)('does not flag %j', (s) => {
    expect(hasAbnormalLanguageMixing(s)).toBe(false);
  });

  test.each(MIXED_SCRIPTS_FOR_OTHER_CHECKS)(
    'isFancyText still catches %j',
    (s) => {
      expect(isFancyText(s)).toBe(true);
    }
  );

  test.skip('Hangul + Han in one word (e.g. "韓國어")', () => {});
  test.skip('Bopomofo + Han in one word (e.g. "台灣ㄉ")', () => {});
  test.skip('homoglyphs separated by punctuation (e.g. "p.а.y.p.a.l")', () => {});
});

// skipped until normalizeUnicodeFancyText is implemented again (decancer was removed for v1)
describe.skip('fancy unicode normalization', () => {
  test.each(CLICK_HERE_FANCY_VARIATIONS)(
    'normalizeUnicodeFancyText normalizes fancy text "%s"',
    (s) => {
      const t = normalizeUnicodeFancyText(s)
        .trimEnd()
        .trimStart()
        .toLowerCase();
      expect(t).toContain('click here');
    }
  );

  // test.each(CLICK_HERE_FANCY_VARIATIONS_TRICKY)(
  //   'normalizeUnicodeFancyText normalizes very tricky fancy text "%s"',
  //   (s) => {
  //     const t = normalizeUnicodeFancyText(s)
  //       .trimEnd()
  //       .trimStart()
  //       .toLowerCase();
  //     expect(t).toContain('click here');
  //   }
  // );
});
