import {
  containsFancyUnicodeText,
  normalizeUnicodeFancyText,
} from '../src/social-media/normalization';

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
  'c̴̢͑̀l̶͕̎̐̑́͒̇͝i̵͓͇̫̬̼̻͔̰̜̒c̴̮̦̲̙̗̜͓̼̑k̵͔͍̼͖͈̯̥̣̐̊̀̈̚͝ ̴̧̢̡̩̙̱̗͍̯̐̂̃͝ͅh̸͙̺͓̟̽̃̽͝͝e̴̯̦̞͎̫̘̳͔͛̄͑̿ͅr̷̖̒͋̚e̴̥̫̗͎͓̋̓͝',
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
  '˜”*°•.˜”*°• click here •°*”˜.•°*”˜',
  'c҉l҉i҉c҉k҉ ҉h҉e҉r҉e҉',
  'ᑕᒪIᑕK ᕼEᖇE',
  'ᑢᒪᓰᑢᖽᐸ ᕼᘿᖇᘿ',
  'c̶l̶i̶c̶k̶ ̶h̶e̶r̶e̶',
  'c̴l̴i̴c̴k̴ ̴h̴e̴r̴e̴',
  'c̷l̷i̷c̷k̷ ̷h̷e̷r̷e̷',
  'c̲l̲i̲c̲k̲ ̲h̲e̲r̲e̲',
  'c̳l̳i̳c̳k̳ ̳h̳e̳r̳e̳',
  'c̾l̾i̾c̾k̾ ̾h̾e̾r̾e̾',
  'c͎l͎i͎c͎k͎ ͎h͎e͎r͎e͎',
  'c͓̽l͓̽i͓̽c͓̽k͓̽ ͓̽h͓̽e͓̽r͓̽e͓̽',
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
  //'ｃｌｉｃｋ　ｈｅｒｅ　佳タ唄',
  //'ｃｌｉｃｋ░ｈｅｒｅ　（佳タ唄）',
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

describe('fancy unicode detection and normalization', () => {
  test('containsFancyUnicodeText detects fancy text', () => {});

  test("containsFancyUnicodeText doesn't misfire on non-fancy text", () => {});

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

  test.each(CLICK_HERE_FANCY_VARIATIONS)(
    'containsFancyUnicodeText detects fancy text "%s"',
    (s) => {
      expect(containsFancyUnicodeText(s)).toBe(true);
    }
  );

  test.each(NORMAL_TEXT)(
    'containsFancyUnicodeText does not detect fancy text on "%s"',
    (s) => {
      expect(containsFancyUnicodeText(s)).toBe(false);
    }
  );
});
