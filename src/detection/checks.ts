import { isFirstOrLastDayOfMonth } from '../common/dates';
import { isNumber } from '../common/helpers';
import { Post } from '../social-media/models';
import { isFancyText } from './fancy-text';
import {
  Check,
  CheckContext,
  CheckDefinition,
  CheckGroupDefinition,
} from './models';
import {
  ADULT_PROMO_DOMAINS,
  containsKeyword,
  handleMismatchesName,
  hasAiCharacters,
  hasBaitPersona,
  hasCryptoPromo,
  hasLanguageMismatch,
  hasLopsidedFollowing,
  hasMentionHashtagStuffing,
  hasPromoBio,
  hasPromoLocation,
  hasSpamLinks,
  hasSpamName,
  isGenericReply,
  linksToDomain,
  looksLikeOnlyFans,
  looksRandomHandle,
} from './signals';

const YEAR_DAYS = 365;

/**
 * Every check, in report order. Adding a check means adding one entry here.
 *
 * General guidelines for writing checks:
 * 1. A check should not single-handedly mark someone as a bot (weigh more than ~75%). If an account is a bot, multiple checks should show it.
 */
export const CHECK_DEFINITIONS = {
  // region distrust checks

  blueCheck: {
    id: 'blue-check',
    label: 'Paid blue checkmark (non-business)',
    reasoning:
      'Some verification marks (ahem Twitter) have become pay-to-win, effectively erasing their efficacy. In fact, bots can use these pay-to-win methods to gain the illusion of credibility.',
    defaultWeight: 0.3, // Blue checks aren't worth anything anymore.
    test: ({ user }) => isVerifiedOrPlus(user) && !isOfficialProfile(user),
  },
  quotedCheckmark: {
    id: 'quoted-checkmark',
    label: 'Quote-tweeted a blue checkmark',
    reasoning:
      'Bots typically repost each other for multiplicative engagement. However, people get ragebaited easily, so not a silver bullet.',
    defaultWeight: 0.05, // people get rage-baited, so lower
    test: ({ post }) => didQuoteCheckmark(post),
  },
  newAccount: {
    id: 'new-account',
    label: 'Newly-created account',
    defaultWeight: 0.2,
    logicalOperation: 'FIRST',
    checks: [
      {
        id: 'new-account-days',
        label: 'Account made within the past week',
        defaultWeight: 0.65,
        test: ({ ageDays }) => ageDays !== undefined && ageDays < 7,
      },
      {
        id: 'new-account-weeks',
        label: 'Account made within the past 14 days',
        defaultWeight: 0.55,
        test: ({ ageDays }) => ageDays !== undefined && ageDays < 14,
      },
      {
        id: 'new-account-month',
        label: 'Account younger than 30 days',
        defaultWeight: 0.35,
        test: ({ ageDays }) => ageDays !== undefined && ageDays < 30,
      },
      {
        id: 'new-account-quarter',
        label: 'Account younger than 90 days',
        defaultWeight: 0.1,
        test: ({ ageDays }) => ageDays !== undefined && ageDays < 90,
      },
      {
        id: 'new-account-year',
        label: 'Account made within the past year',
        defaultWeight: 0.03,
        test: ({ ageDays }) => ageDays !== undefined && ageDays < 365,
      },
    ],
  },

  postAiAccount: {
    id: 'post-ai-account',
    label: 'Account was created after 2023-01-01',
    reasoning:
      'Accounts made past the widespread introduction of LLMs have to be treated with slightly more caution.',
    defaultWeight: 0.05,
    test: ({ user, ageDays }) =>
      ageDays !== undefined &&
      (user.about?.createdAt ?? new Date(0)) > new Date('2023-01-01'),
  },
  accountCreationDate: {
    id: 'account-creation-date',
    label: 'Account created on the first or last day of the month',
    reasoning:
      'Bot farms could have a monthly script to create new accounts that run all at once. Very much could be a coincidence though.',
    defaultWeight: 0.02, // strange and potentially indicative of bot behavior, but not conclusive whatsoever
    test: ({ user, ageDays }) =>
      ageDays !== undefined && isAccountCreationOnFirstOrLastDay(user),
  },
  highTweetRate: {
    id: 'high-tweet-rate',
    label: 'More than 100 posts per day on average',
    defaultWeight: 0.15,
    test: ({ ageDays, statuses }) =>
      ageDays !== undefined && isNumber(statuses) && statuses / ageDays > 100,
  },
  lowFollowersRatio: {
    id: 'low-followers-ratio',
    label: 'Follows many more accounts than follow it',
    reasoning:
      "Some bot accounts are solely made for the purpose of boosting others' followings",
    defaultWeight: 0.1,
    test: ({ followers, following }) =>
      isNumber(followers) &&
      isNumber(following) &&
      following >= 100 &&
      followers / following < 0.1,
  },
  lowFollowerFollowingRatio: {
    id: 'low-followers-following-ratio',
    label:
      'Bot accounts follow each other and like each others posts. Having around the same amount of followers and following is a common pattern.',
    reasoning: "Botnets follow each other and like each other's posts",
    defaultWeight: 0.1, // bot-nets follow and like each other
    test: ({ followers, following }) =>
      isNumber(followers) &&
      isNumber(following) &&
      following >= 100 &&
      followers / following >= 0.9 &&
      followers / following <= 1.1,
  },
  lopsidedFollowing: {
    id: 'lopsided-following',
    label: 'Thousands of followers but follows almost nobody',
    reasoning:
      'Might catch some false positives, but some bots use this to try and seem more credible.',
    defaultWeight: 0.05,
    test: ({ user, followers, following }) =>
      !isOfficialProfile(user) &&
      isNumber(followers) &&
      isNumber(following) &&
      hasLopsidedFollowing(followers, following),
  },
  autoGeneratedHandle: {
    id: 'auto-handle',
    label: 'Handle ends or begins with 5+ digits',
    reasoning:
      'Bot accounts can have auto-generated names, which are of the format [adjective][noun][numbers] (see Fortnite bot names). >5 digits rules out full years and shortened years.',
    defaultWeight: 0.15,
    test: ({ user }) => /(\d{5,}$)|(^\d{5,}.*)/.test(user.username ?? ''),
  },
  onlyFansModel: {
    id: 'onlyfans-model',
    label: 'OnlyFans account',
    reasoning:
      "Sex sells, and sex scams. Catches scam bots the best (as opposed to astroturf bots). Isn't exclusive to OnlyFans but also other camgirl-like accounts.",
    defaultWeight: 0.2, // why is it always onlyfans accounts
    test: ({ user, profileLinks }) => looksLikeOnlyFans(user, profileLinks),
  },
  excessivePromo: {
    id: 'excessive-promo',
    label:
      'Location or bio points at something (usually a link with arrows, "more here", "nearby") instead of naming a place',
    reasoning:
      'Excessive promotion (to the point of utilizing labels incorrectly) is a classic sign from bots.',
    defaultWeight: 0.1, // accounts that excessively promote content in their profile
    test: ({ user }) =>
      hasPromoLocation(user.location) || hasPromoBio(user.bio),
  },
  baitPersona: {
    id: 'bait-persona',
    label: 'Bio reads like a lure ("goth baddie", "exclusive pics", "text me")',
    reasoning: 'Very common in scam bots.',
    defaultWeight: 0.1,
    test: ({ user }) => hasBaitPersona(user.bio, user.location),
  },
  cryptoPromo: {
    id: 'crypto-promo',
    label: 'Crypto talk in the bio, name or post (coins, sats, cashtags)',
    reasoning: 'Scammers are gonna scam.',
    defaultWeight: 0.1,
    test: ({ user, post }) =>
      hasCryptoPromo(user.bio, user.displayName, post.content.text),
  },
  recentUsernameChange: {
    id: 'recent-username-change',
    label: 'Username changed in the last year or many times',
    reasoning:
      'Bad actors frequently buy hacked accounts of real users to then use to push their agenda/scam. Some people also sell their accounts.',
    defaultWeight: 0.15,
    test: ({ usernameChanges, now, dayMs }) =>
      usernameChanges !== undefined &&
      (usernameChanges.count >= 3 ||
        (usernameChanges.lastChangedMs !== undefined &&
          now - usernameChanges.lastChangedMs < YEAR_DAYS * dayMs)),
  },
  aiCharactersBio: {
    id: 'ai-characters-bio',
    label: 'Bio contains typographic characters (em dash, ellipsis, arrows)',
    reasoning:
      "While LLMs typically use these, and physical keyboards don't come with them, cellphone keyboards do use them. It's a weaker check.",
    defaultWeight: 0.03,
    test: ({ user }) => hasAiCharacters(user.bio),
  },
  noDescription: {
    id: 'no-description',
    label: 'Empty profile description/bio',
    defaultWeight: 0.05,
    test: ({ user }) => !user.bio?.trim(),
  },
  noBanner: {
    id: 'no-banner',
    label: 'No profile banner',
    defaultWeight: 0.05,
    test: ({ user }) => !user.profileElements?.bannerUrl,
  },
  defaultProfileImage: {
    id: 'default-profile-image',
    label: 'Default profile picture',
    defaultWeight: 0.1,
    test: ({ user }) =>
      (user.profileElements?.imageUrl ?? '').includes('default_profile'),
  },
  displayNameSpam: {
    id: 'display-name-spam',
    label:
      'Display name is emoji-heavy or advertises DMs, giveaways or adult content',
    defaultWeight: 0.1,
    test: ({ user }) => hasSpamName(user.displayName),
  },
  randomHandle: {
    id: 'random-handle',
    label: 'Handle looks randomly generated',
    reasoning:
      'Real people pick handles that represent them. Accounts with the sole purpose of boosting others need no personality of their own.',
    defaultWeight: 0.05,
    test: ({ user }) => looksRandomHandle(user.username),
  },
  handleNameMismatch: {
    id: 'handle-name-mismatch',
    label: 'Handle has nothing in common with the display name',
    reasoning:
      'A much weaker check, but typically names match in one way or another.',
    defaultWeight: 0.03,
    test: ({ user }) => handleMismatchesName(user.displayName, user.username),
  },
  engagementMismatch: {
    id: 'engagement-mismatch',
    label: 'Posts a lot but never likes anything, or likes at an extreme rate',
    reasoning:
      'Bots are best for 2 things: swaying opinion (astroturfing) and boosting others (following/likes/engagements). They CAN do both, but',
    defaultWeight: 0.08,
    test: ({ likes, statuses, ageDays }) =>
      isNumber(likes) &&
      ((isNumber(statuses) && statuses >= 1000 && likes < 10) ||
        (ageDays !== undefined && likes / ageDays > 500)),
  },
  noMedia: {
    id: 'no-media',
    label: 'Active account that has never posted media',
    reasoning: "For bots, it's easier to post text",
    defaultWeight: 0.03,
    test: ({ user, statuses }) =>
      user.stats.postStats.media === 0 &&
      isNumber(statuses) &&
      statuses >= 1000,
  },
  spamLinks: {
    id: 'spam-links',
    label:
      'Profile has link shorteners, Telegram/WhatsApp contacts, or crypto wallets',
    defaultWeight: 0.15,
    test: ({ user, profileLinks }) =>
      hasSpamLinks(user.bio, user.location, user.url, user.displayName) ||
      linksToDomain(profileLinks, ADULT_PROMO_DOMAINS),
  },
  scamKeywordsBio: {
    id: 'scam-keywords-bio',
    label: 'Bio contains scam or spam keywords',
    defaultWeight: 0.1,
    test: ({ user, scamKeywords }) =>
      containsKeyword(
        `${user.bio ?? ''} ${user.displayName ?? ''}`,
        scamKeywords /* TODO: is this a fine enough check? */
      ),
  },
  fancyText: {
    id: 'fancy-text',
    label: 'Fancy text',
    defaultWeight: 0.1,
    logicalOperation: 'NONE',
    checks: [
      {
        id: 'fancy-text-in-name',
        label: 'Name contains fancy UTF text',
        defaultWeight: 0.1,
        test: ({ user }) => isFancyText(user.displayName),
      },
      {
        id: 'fancy-text-in-bio',
        label: 'Bio contains fancy UTF text',
        defaultWeight: 0.1,
        test: ({ user }) => isFancyText(user.bio ?? ''),
      },
      {
        id: 'fancy-text-in-location',
        label: 'Location contains fancy UTF text',
        defaultWeight: 0.1,
        test: ({ user }) => isFancyText(user.location ?? ''),
      },
      {
        id: 'fancy-text-in-post',
        label: 'Post text contains fancy UTF text',
        defaultWeight: 0.15,
        test: ({ post }) => isFancyText(post.content.text ?? ''),
      },
    ],
  },
  genericReply: {
    id: 'generic-reply',
    label: 'Reply is a very short generic phrase',
    defaultWeight: 0.05,
    test: ({ post }) => isGenericReply(post),
  },
  mentionHashtagStuffing: {
    id: 'mention-hashtag-stuffing',
    label: 'Post stuffs in many mentions or hashtags',
    reasoning: 'Scam bots like to bulk-tag a bunch of people/topics',
    defaultWeight: 0.15,
    test: ({ post }) => hasMentionHashtagStuffing(post),
  },
  duplicateText: {
    id: 'duplicate-text',
    label: 'The same text appears in more than one post on this page',
    reasoning: "I've personally seen this a lot. Word-forwird replies/posts.",
    defaultWeight: 0.2,
    test: ({ duplicateTextCount }) => duplicateTextCount >= 2,
  },
  languageMismatch: {
    id: 'language-mismatch',
    label: 'Post language differs from the bio language',
    defaultWeight: 0.02,
    test: ({ post }) => hasLanguageMismatch(post),
  },

  // region trust signal checks

  protectedAccount: {
    id: 'protected-account',
    label: 'Protected account',
    reasoning:
      "Accounts that are private/protected aren't in it for the engagement. They COULD be in it for like-botting though...", // TODO: maybe rethink this and see if private account likes show up on posts to others.
    defaultWeight: -0.05,
    test: ({ user }) => user.labels.isPrivate === true,
  },
  establishedAccount: {
    id: 'established-account',
    label: 'Old, active account with a real following',
    defaultWeight: -0.1,
    test: ({ ageDays, followers, statuses }) =>
      ageDays !== undefined &&
      ageDays >= 4 * YEAR_DAYS &&
      isNumber(followers) &&
      followers >= 100 &&
      isNumber(statuses) &&
      statuses >= 500,
  },
  officialVerified: {
    id: 'official-verified',
    label: 'Business verification',
    reasoning:
      "While bot accounts can be verified as a real business, it's pretty rare.",
    defaultWeight: -0.15,
    // government accounts get their own check, so they aren't counted twice here
    test: ({ user }) => isBusinessVerified(user),
  },
  governmentAccount: {
    id: 'government-account',
    label: 'Government account',
    reasoning:
      'Officially-marked government accounts represent real politicians or real organizations',
    defaultWeight: -0.15,
    test: ({ user }) => user.labels.isGovernment === true,
  },
} as const satisfies Record<string, CheckDefinition | CheckGroupDefinition>;

export type CheckKey = keyof typeof CHECK_DEFINITIONS;
export type CheckWeights = Record<CheckKey, number>;

export const CHECK_KEYS = Object.keys(CHECK_DEFINITIONS) as CheckKey[];

export const DEFAULT_WEIGHTS: Readonly<CheckWeights> = Object.fromEntries(
  CHECK_KEYS.map((key) => [key, CHECK_DEFINITIONS[key].defaultWeight])
) as CheckWeights;

/**
 * Creates a check for the bot detection report.
 * @param id The unique identifier for the check.
 * @param label The human-readable label for the check.
 * @param weight The weight of the check in the overall bot detection score.
 * @param triggered Whether the check was triggered.
 * @returns A BotCheck object representing the result of the check.
 */
export function makeCheck(
  id: string,
  label: string,
  weight: number,
  triggered: boolean
): Check {
  return {
    id,
    label,
    weight,
    triggered,
    contribution: triggered ? weight : 0,
  };
}

export function makeGroupCheck(
  group: CheckGroupDefinition,
  ctx: CheckContext
): Check {
  let contribution = 0,
    triggered = false;
  switch (group.logicalOperation) {
    case 'NONE': {
      const passed = group.checks.filter((c) => {
        return c.test(ctx);
      });
      triggered = passed.length > 0;
      contribution = passed.reduce(
        (accumulator, curr) => accumulator + curr.defaultWeight,
        0
      );

      break;
    }
    case 'FIRST': {
      const first = group.checks.find((c) => {
        return c.test(ctx);
      });
      triggered = !!first;
      contribution = first?.defaultWeight ?? 0;
      break;
    }
    default:
      break;
  }

  return {
    id: group.id,
    label: group.label,
    weight: group.defaultWeight,
    contribution,
    triggered,
  };
}

// region check definition type guards

export function isDefinition(data: unknown): data is CheckDefinition {
  return !!data && typeof data === 'object' && 'test' in data;
}

export function isDefinitionGroup(data: unknown): data is CheckGroupDefinition {
  return (
    !!data &&
    typeof data === 'object' &&
    'checks' in data &&
    'logicalOperation' in data
  );
}

// region check test helpers

/**
 * @returns True if the user's verification is organizational (Business or Government) rather than a paid blue check.
 */
function isOfficialProfile(user: Post['user'] | undefined): boolean {
  return Boolean(user?.labels.isBusiness || user?.labels.isGovernment);
}

function isBusinessVerified(user: Post['user'] | undefined): boolean {
  return user?.labels.isVerified === true && user.labels.isBusiness === true;
}

function isAccountCreationOnFirstOrLastDay(user: Post['user']): boolean {
  return isFirstOrLastDayOfMonth(user.about.createdAt);
}

function isVerifiedOrPlus(user: Post['user'] | undefined): boolean {
  return (user?.labels.isVerified || user?.labels.isPlus) ?? false;
}

function didQuoteCheckmark(post: Post): boolean {
  const quotedUser = post.repost?.user;
  const isQuotedUserBusiness = quotedUser?.labels.isBusiness;
  const quotedUserVerifiedType =
    (quotedUser?.labels.isGovernment || quotedUser?.labels.isBusiness) ?? false;
  return (
    isVerifiedOrPlus(quotedUser) &&
    !quotedUserVerifiedType &&
    !isQuotedUserBusiness
  );
}
