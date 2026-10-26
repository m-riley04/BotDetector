import * as signals from '../src/detection/signals';
import { Post } from '../src/social-media/models';

const post = (fields: Record<string, unknown> = {}): Post =>
  ({
    id: 'post',
    content: { text: fields.full_text },
    inReplyToPostId: fields.in_reply_to_status_id_str,
    language: fields.lang,
    user: fields.user ?? {},
    ...fields,
  }) as unknown as Post;

test('countEmoji and hasSpamName', () => {
  expect(signals.countEmoji('hi 🔥🔥 there 😀')).toBe(3);
  expect(signals.countEmoji('plain')).toBe(0);

  expect(signals.hasSpamName('Jess 🔥💦🍑')).toBe(true);
  expect(signals.hasSpamName('Jess DM me')).toBe(true);
  expect(signals.hasSpamName('Jess 18+')).toBe(true);
  expect(signals.hasSpamName('Free Giveaway')).toBe(true);
  expect(signals.hasSpamName('Jess 🔥')).toBe(false);
  expect(signals.hasSpamName('Dmitri')).toBe(false);
  expect(signals.hasSpamName(undefined)).toBe(false);
});

test('looksRandomHandle flags gibberish but not ordinary handles', () => {
  for (const handle of ['xk29dj44', 'bcdfghjk', 'a1b2c3d4']) {
    expect(signals.looksRandomHandle(handle)).toBe(true);
  }
  for (const handle of [
    'ordinary_user',
    'user12345x',
    'john_smith',
    'mike99',
    undefined,
  ]) {
    expect(signals.looksRandomHandle(handle)).toBe(false);
  }
});

test('handleMismatchesName needs a multi-word name and a digit-heavy unrelated handle', () => {
  expect(signals.handleMismatchesName('Emma Rose', 'kj83821')).toBe(true);
  expect(signals.handleMismatchesName('Emma Rose', 'emma_rose1')).toBe(false);
  expect(signals.handleMismatchesName('Emma Rose', 'qwerty')).toBe(false);
  expect(signals.handleMismatchesName('Emma', 'kj83821')).toBe(false);
  expect(signals.handleMismatchesName(undefined, undefined)).toBe(false);
});

test('hasSpamLinks finds shorteners, messengers and wallets', () => {
  for (const text of [
    'see bit.ly/abc',
    't.me/channel',
    'telegram: @x',
    'WhatsApp: +123',
    '0x52908400098527886E0F7030069857D2E4169EE7',
    'chat.whatsapp.com/xyz',
  ]) {
    expect(signals.hasSpamLinks(text)).toBe(true);
  }
  expect(signals.hasSpamLinks('my blog example.com', undefined, '')).toBe(
    false
  );
  expect(signals.hasSpamLinks(undefined, 'bit.ly/x')).toBe(true);
});

test('containsKeyword is case-insensitive and ignores empty keywords', () => {
  expect(signals.containsKeyword('Join the AIRDROP now', ['airdrop'])).toBe(
    true
  );
  expect(signals.containsKeyword('hello', ['airdrop', ' '])).toBe(false);
  expect(signals.containsKeyword(undefined, ['airdrop'])).toBe(false);
});

test('isGenericReply only matches short generic replies', () => {
  const reply = (full_text: string) =>
    post({ full_text, in_reply_to_status_id_str: '1' });

  for (const text of [
    '@a Nice!',
    '@a Great post 🔥',
    '@a 🔥🔥',
    '@a LOL',
    '@a W',
  ]) {
    expect(signals.isGenericReply(reply(text))).toBe(true);
  }
  expect(
    signals.isGenericReply(reply('@a I disagree because of the data'))
  ).toBe(false);
  expect(signals.isGenericReply(reply('@a'))).toBe(false);
  expect(signals.isGenericReply(post({ full_text: 'Nice!' }))).toBe(false);
  expect(signals.isGenericReply(post({ full_text: '@a Nice!' }))).toBe(true);
});

test('hasMentionHashtagStuffing ignores leading reply mentions', () => {
  expect(
    signals.hasMentionHashtagStuffing(
      post({ full_text: '#a #b #c #d #e buy now' })
    )
  ).toBe(true);
  expect(
    signals.hasMentionHashtagStuffing(post({ full_text: 'hi @a @b @c @d @e' }))
  ).toBe(true);
  expect(
    signals.hasMentionHashtagStuffing(
      post({ full_text: 'x #a #b #c #d @e @f @g' })
    )
  ).toBe(true);
  expect(
    signals.hasMentionHashtagStuffing(
      post({ full_text: '@a @b @c @d @e @f thanks' })
    )
  ).toBe(false);
  expect(signals.hasMentionHashtagStuffing(post())).toBe(false);
});

test('hasLanguageMismatch compares post and bio languages', () => {
  const t = (language?: string, bioLanguage?: string) =>
    post({ language, user: { bioLanguage } });

  expect(signals.hasLanguageMismatch(t('en', 'ja'))).toBe(true);
  expect(signals.hasLanguageMismatch(t('en', 'en'))).toBe(false);
  expect(signals.hasLanguageMismatch(t('und', 'en'))).toBe(false);
  expect(signals.hasLanguageMismatch(t('en', ''))).toBe(false);
  expect(signals.hasLanguageMismatch(t(undefined, 'en'))).toBe(false);
});

describe('promo signals', () => {
  test.each([
    '👉',
    'more here →',
    'Moar here',
    'Nearby',
    '1.6 from near your heart',
    'Text Me Here 👇🏻',
    '↙',
  ])('location "%s" is promotional', (location) => {
    expect(signals.hasPromoLocation(location)).toBe(true);
  });

  test.each(['Paris, France', 'Austin, TX', 'near Boston', '', undefined])(
    'location "%s" is not promotional',
    (location) => {
      expect(signals.hasPromoLocation(location)).toBe(false);
    }
  );

  test('a bio needs a pointer and a call to action', () => {
    expect(signals.hasPromoBio('exclusive pics of meee ↙')).toBe(true);
    expect(signals.hasPromoBio('Left 👉 or right')).toBe(false);
    expect(signals.hasPromoBio('exclusive pics of me')).toBe(false);
  });

  test('bait personas and crypto talk', () => {
    expect(signals.hasBaitPersona('goth baddie, petite princess')).toBe(true);
    expect(signals.hasBaitPersona('I like gardening')).toBe(false);
    expect(signals.hasCryptoPromo('Bitcoin maxi, hodl')).toBe(true);
    expect(signals.hasCryptoPromo('buy $BTC now')).toBe(true);
    expect(signals.hasCryptoPromo('I like gardening')).toBe(false);
  });

  test('lopsided following needs a big, one-sided audience', () => {
    expect(signals.hasLopsidedFollowing(14196, 16)).toBe(true);
    expect(signals.hasLopsidedFollowing(193970, 0)).toBe(true);
    expect(signals.hasLopsidedFollowing(4233, 3630)).toBe(false);
    expect(signals.hasLopsidedFollowing(500, 1)).toBe(false);
  });
});

describe('profile links', () => {
  const user = (fields: Record<string, unknown>) =>
    fields as unknown as Post['user'];

  test('t.co links are swapped for their destination', () => {
    const links = signals.collectProfileLinks(
      user({ url: 'https://t.co/abc123' }),
      { 'https://t.co/abc123': 'https://onlyfans.com/x' }
    );
    expect(links).toEqual(['https://onlyfans.com/x']);
  });

  test('entity urls are collected', () => {
    const links = signals.collectProfileLinks(
      user({
        links: { urls: ['https://fansly.com/a'] },
      })
    );
    expect(links).toEqual(['https://fansly.com/a']);
  });

  test('adult-promo domains match subdomains but not lookalikes', () => {
    const domains = signals.ADULT_PROMO_DOMAINS;
    expect(signals.linksToDomain(['https://www.bouncy.ai/x'], domains)).toBe(
      true
    );
    expect(signals.linksToDomain(['https://me.beacons.ai/x'], domains)).toBe(
      true
    );
    expect(signals.linksToDomain(['https://notbouncy.ai/x'], domains)).toBe(
      false
    );
    expect(signals.linksToDomain(['https://example.com'], domains)).toBe(false);
  });

  test('an adult link marks the profile as OnlyFans-style', () => {
    const profile = user({ bio: 'hi', displayName: 'Sam' });
    expect(signals.looksLikeOnlyFans(profile)).toBe(false);
    expect(signals.looksLikeOnlyFans(profile, ['https://bouncy.ai/x'])).toBe(
      true
    );
  });
});

test('getUsernameChanges reads the About data', () => {
  const user = (about: unknown) => ({ about }) as unknown as Post['user'];

  expect(
    signals.getUsernameChanges(
      user({
        usernameChanges: 2,
        lastUsernameChange: new Date(1700000000000),
      })
    )
  ).toEqual({ count: 2, lastChangedMs: 1700000000000 });
  expect(signals.getUsernameChanges(user(undefined))).toBeUndefined();
  expect(
    signals.getUsernameChanges(user({ usernameChanges: 0 }))
  ).toBeUndefined();
});
