import { toNumber } from '../common/helpers';
import type { Post } from '../social-media/models';

type PostUser = Post['user'];

/**
 * Words that bot and scam networks commonly put in bios; users can extend this in the popup.
 */
export const DEFAULT_SCAM_KEYWORDS: readonly string[] = [
  'airdrop',
  'dm for signals',
  'dm for promo',
  '100x',
  'giveaway',
  'forex',
  'crypto signals',
  'trading signals',
  'binary options',
  'pump and dump',
  'guaranteed profit',
  'passive income',
  'recovery expert',
  'whatsapp me',
];

const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'l',
  '3': 'e',
  '4': 'a',
  '5': 's',
  $: 's',
  '@': 'a',
};

const KNOWN_ONLYFANS_LINKS = ['onlyfans.com', 'fansly.com', 'spicey.link'];

/**
 * Adult-content subscription sites and the link-in-bio pages those accounts use.
 */
export const ADULT_PROMO_DOMAINS: readonly string[] = [
  'onlyfans.com',
  'fansly.com',
  'fanvue.com',
  'loyalfans.com',
  'justfor.fans',
  'manyvids.com',
  'fancentro.com',
  'fanfix.io',
  'fapello.com',
  'spicey.link',
  'bouncy.ai',
  'beacons.ai',
  'dm.bio',
  'allmylinks.com',
  'linkr.bio',
  'solo.to',
];

/**
 *
 * @param link The URL to extract the host from.
 * @returns The hostname of the URL, lowercased and without the "www." prefix, or undefined if the URL is invalid.
 */
function hostOf(link: string): string | undefined {
  try {
    return new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(link) ? link : `https://${link}`
    ).hostname
      .toLowerCase()
      .replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

/**
 * True if any link points at (a subdomain of) one of the given domains.
 */
export function linksToDomain(
  links: readonly string[],
  domains: readonly string[]
): boolean {
  return links.some((link) => {
    const host = hostOf(link);
    return (
      host !== undefined &&
      domains.some((domain) => host === domain || host.endsWith(`.${domain}`))
    );
  });
}

/**
 * Every link a profile advertises, with t.co links swapped for their destination when known.
 * @param expanded Destinations learned by expanding t.co links.
 */
export function collectProfileLinks(
  user: PostUser,
  expanded: Readonly<Record<string, string>> = {}
): string[] {
  const links: string[] = [];
  const add = (value: unknown) => {
    if (typeof value === 'string' && value.length > 0) {
      links.push(expanded[value] ?? value);
    }
  };

  add(user.url);
  for (const entry of user.links.urls) {
    add(entry);
  }
  return links;
}

/**
 * Detects OnlyFans-style promotion in a profile: the keyword (including leetspeak),
 * "OF: link" patterns, known links in the bio, or a profile link to an adult-content site.
 */
export function looksLikeOnlyFans(
  user: PostUser,
  profileLinks: readonly string[] = []
): boolean {
  const text = `${user.bio ?? ''} ${user.displayName ?? ''}`;
  const deLeeted = text.replace(/[01345$@]/g, (char) => LEET_MAP[char] ?? char);
  const lower = text.toLowerCase();

  return (
    /onlyfans/i.test(deLeeted) ||
    /\bof\s*:\s*(https?:\/\/|\S+\.\S+)/i.test(text) ||
    KNOWN_ONLYFANS_LINKS.some((link) => lower.includes(link)) ||
    linksToDomain(profileLinks, ADULT_PROMO_DOMAINS)
  );
}

const POINTERS = /[→←↑↓↖↗↘↙↳⤵⤴⬅⬆⬇➡👉👈👇👆]/u;

const LOCATION_BAIT =
  /\b(?:more here|moar|more of me|link (?:in|below|here)|click|text me|dm me|vip|exclusive|subscribe|my page|nearby|near (?:you|me|your)|miles? (?:from|away)|\d+(?:\.\d+)?\s*(?:km|mi|miles?)?\s+(?:from|away))\b/i;

const BIO_CALL_TO_ACTION =
  /\b(?:text me|dm me|dms|message me|link|click|here|exclusive|subscribe|vip|my page|more|pics|content|check|free|join|below|open)\b/i;

/**
 * Locations used as an advert instead of a place: pointing arrows/emoji ("👉", "more here →")
 * or lures such as "nearby" and "1.6 miles from you".
 */
export function hasPromoLocation(location: string | undefined): boolean {
  const value = location ?? '';
  return POINTERS.test(value) || LOCATION_BAIT.test(value);
}

/**
 * A bio that points at something: an arrow or pointing emoji next to a call to action.
 */
export function hasPromoBio(description: string | undefined): boolean {
  const value = description ?? '';
  return POINTERS.test(value) && BIO_CALL_TO_ACTION.test(value);
}

const BAIT_PERSONA =
  /\b(?:baddie|petite princess|goth(?:ic)? (?:blond\w*|gf|girl|bunny)|e-?girl|spicy|naughty|horny|thirsty|exclusive (?:pics|content|photos|vids?)|text me|dm me|dms open|cosplayer girl|cosplay girl|support me|your (?:gf|girlfriend)|nsfw|[45]\s?(?:ft|')\s?\d{1,2}|(?:behind the scenes|bts) of my life)\b|\b(?:18|21)\+/i;

/**
 * Bios written to lure clicks: "goth baddie", "petite princess", "exclusive pics", and so on.
 */
export function hasBaitPersona(...fields: Array<string | undefined>): boolean {
  return BAIT_PERSONA.test(fields.filter(Boolean).join(' '));
}

const CRYPTO_TERMS =
  /\b(?:bitcoin|btc|ethereum|solana|crypto(?:currency)?|web3|nfts?|defi|altcoins?|memecoins?|hodl|sats|satoshis?|blockchain|binance|airdrops?)\b|₿|\$[A-Z]{2,6}\b/i;

/**
 * Crypto talk in a profile or post: coins, "sats", cashtags like $BTC.
 */
export function hasCryptoPromo(...fields: Array<string | undefined>): boolean {
  const text = fields.filter(Boolean).join(' ');
  return CRYPTO_TERMS.test(text) || /\$[A-Z]{2,6}\b/.test(text);
}

/**
 * Lots of followers but almost nobody followed back, the shape of bought or lure accounts.
 */
export function hasLopsidedFollowing(
  followers: number,
  following: number
): boolean {
  return followers >= 3000 && followers / Math.max(following, 1) >= 100;
}

export interface UsernameChanges {
  count: number;

  /**
   * Unix time in milliseconds of the most recent change, if known.
   */
  lastChangedMs?: number;
}

/**
 * Reads the handle history from the "About this account" data (`about_profile.username_changes`),
 * when the tweet carries it. X doesn't always include it.
 */
export function getUsernameChanges(
  user: PostUser
): UsernameChanges | undefined {
  const lastChangedMs = toNumber(user.about?.lastUsernameChange);
  const count =
    toNumber(user.about?.usernameChanges) ?? (lastChangedMs ? 1 : 0);
  return count > 0 || lastChangedMs ? { count, lastChangedMs } : undefined;
}

const AI_CHARACTERS = /[—–…‘’“”→←↑↓]/;

/**
 * Typographic characters that are rarely typed by hand on a standard keyboard.
 */
export function hasAiCharacters(text: string | undefined): boolean {
  return AI_CHARACTERS.test(text ?? '');
}

/**
 * Counts the amount of emojis in the given text.
 * @param text
 * @returns
 */
export function countEmoji(text: string): number {
  return text.match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
}

const SPAM_NAME =
  /(?:^|\W)(?:dm me|dm for|link in bio|giveaway|airdrop|follow ?back|ffb|nsfw)(?:\W|$)|18\+|🔞/i;

/**
 * Emoji-heavy display names or names advertising DMs, giveaways, adult content, etc.
 */
export function hasSpamName(name: string | undefined): boolean {
  const value = name ?? '';
  return countEmoji(value) >= 3 || SPAM_NAME.test(value);
}

/**
 * Random-looking handles: long consonant-only runs, or digits and letters
 * interleaved several times (e.g. `xk29dj44`).
 */
export function looksRandomHandle(handle: string | undefined): boolean {
  const value = (handle ?? '').replace(/_/g, '');
  const letters = value.replace(/[^a-z]/gi, '').toLowerCase();
  if (letters.length >= 6) {
    const vowels = letters.match(/[aeiou]/g)?.length ?? 0;
    if (vowels / letters.length < 0.15) return true;
  }

  let transitions = 0;
  for (let i = 1; i < value.length; i++) {
    if (/\d/.test(value[i]) !== /\d/.test(value[i - 1])) transitions += 1;
  }
  return transitions >= 3;
}

/**
 * A "real" looking multi-word name whose handle shares nothing with it and has
 * several digits, e.g. `Emma Rose` / `@kj83821`.
 */
export function handleMismatchesName(
  name: string | undefined,
  handle: string | undefined
): boolean {
  const words = (name ?? '').toLowerCase().match(/\p{L}{3,}/gu) ?? [];
  const normalizedHandle = (handle ?? '').toLowerCase().replace(/_/g, '');
  const digits = normalizedHandle.match(/\d/g)?.length ?? 0;
  if (words.length < 2 || digits < 2) return false;

  return !words.some((word) => {
    for (let i = 0; i + 3 <= word.length; i++) {
      if (normalizedHandle.includes(word.slice(i, i + 3))) return true;
    }
    return false;
  });
}

const SPAM_LINKS = [
  /\b(?:bit\.ly|tinyurl\.com|cutt\.ly|rb\.gy|is\.gd|t\.ly|shorturl\.at)\b/i,
  /\b(?:t\.me|telegram\.me|wa\.me)\/|chat\.whatsapp\.com/i,
  /\b(?:telegram|whatsapp)\s*[:@]/i,
  /\b0x[a-f0-9]{40}\b/i,
  /\b(?:bc1|[13])[a-km-zA-HJ-NP-Z1-9]{25,39}\b/,
];

/**
 * Link shorteners, Telegram/WhatsApp contacts and crypto wallet addresses.
 */
export function hasSpamLinks(...fields: Array<string | undefined>): boolean {
  const text = fields.filter(Boolean).join(' ');
  return SPAM_LINKS.some((pattern) => pattern.test(text));
}

export function containsKeyword(
  text: string | undefined,
  keywords: readonly string[]
): boolean {
  const lower = (text ?? '').toLowerCase();
  return keywords.some((keyword) => {
    const word = keyword.trim().toLowerCase();
    return word.length > 0 && lower.includes(word);
  });
}

const LEADING_MENTIONS = /^(?:\s*@\w+)+/;

export function isReply(post: Post): boolean {
  return (
    Boolean(post.inReplyToPostId) || /^\s*@\w/.test(post.content.text ?? '')
  );
}

const GENERIC_REPLY =
  /^(?:nice|great|good|amazing|awesome|love (?:this|it)|so true|facts|this|agree[d]?|wow|well said|exactly|100%|true|based|lol|haha|thanks|thank you|interesting|beautiful|cool|fire|W)\b[\s\p{P}\p{Extended_Pictographic}]*(?:post|take|tweet|one|content)?[\s\p{P}\p{Extended_Pictographic}]*$/iu;
const ONLY_EMOJI_OR_PUNCTUATION = /^[\s\p{P}\p{Extended_Pictographic}]+$/u;

/**
 * Very short, generic replies like "Nice!" or "Great post 🔥".
 */
export function isGenericReply(post: Post): boolean {
  if (!isReply(post)) return false;

  const body = (post.content.text ?? '')
    .replace(LEADING_MENTIONS, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim();
  if (body.length === 0 || body.length > 30) return false;

  return GENERIC_REPLY.test(body) || ONLY_EMOJI_OR_PUNCTUATION.test(body);
}

/**
 * Many mentions or hashtags in a post. Mentions that only address a reply are ignored.
 */
export function hasMentionHashtagStuffing(post: Post): boolean {
  const text = (post.content.text ?? '').replace(LEADING_MENTIONS, '');
  const mentions = text.match(/@\w+/g)?.length ?? 0;
  const hashtags = text.match(/#\w+/g)?.length ?? 0;
  return mentions >= 5 || hashtags >= 5 || mentions + hashtags >= 7;
}

const IGNORED_LANGUAGES = new Set(['', 'und', 'qme', 'qht', 'zxx', 'art']);

/**
 * The post language differs from the language the bio is written in.
 */
export function hasLanguageMismatch(post: Post): boolean {
  const postLanguage = post.language;
  const bioLanguage = post.user.bioLanguage;
  if (typeof postLanguage !== 'string' || typeof bioLanguage !== 'string') {
    return false;
  }
  if (
    IGNORED_LANGUAGES.has(postLanguage) ||
    IGNORED_LANGUAGES.has(bioLanguage)
  ) {
    return false;
  }
  return postLanguage !== bioLanguage;
}
