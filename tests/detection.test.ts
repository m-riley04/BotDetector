import * as detection from '../src/detection/detection';
import type { BotDetectionReport } from '../src/detection/models';
import type { Tweet } from '../src/adapters/twitter/models';

type TweetUser = Tweet['user'];
type DetectionOptions = typeof detection.DEFAULT_DETECTION_REPORT_OPTIONS;

const fixedNow = Date.parse('2025-01-15T12:00:00.000Z');
const dayMs = 24 * 60 * 60 * 1000;

// Fixtures only set the fields the detector reads. Overrides are intentionally loose so
// tests can pass `undefined` for fields the API may omit.
function makeUser(overrides: Record<string, unknown> = {}): TweetUser {
  return {
    created_at: '2020-06-15T12:00:00.000Z',
    screen_name: 'ordinary_user',
    verified: false,
    is_blue_verified: false,
    verified_type: undefined,
    professional: undefined,
    statuses_count: 0,
    followers_count: 500,
    friends_count: 200,
    description: 'A profile description',
    profile_banner_url: 'https://example.test/banner.jpg',
    ...overrides,
  } as unknown as TweetUser;
}

function makeTweet(
  userOverrides: Record<string, unknown> = {},
  quotedUser?: Record<string, unknown>
): Tweet {
  return {
    user: makeUser(userOverrides),
    quoted_status: quotedUser ? { user: makeUser(quotedUser) } : null,
  } as unknown as Tweet;
}

function getReport(
  tweet: Tweet,
  options?: DetectionOptions
): BotDetectionReport {
  const originalNow = Date.now;
  Date.now = () => fixedNow;
  try {
    const report = detection.getDetectionReport(tweet, options);
    if (!report) throw new Error('expected a detection report');
    return report;
  } finally {
    Date.now = originalNow;
  }
}

function check(report: BotDetectionReport, id: string) {
  const result = report.checks.find((item) => item.id === id);
  if (!result) throw new Error(`expected check "${id}" to exist`);
  return result;
}

function customOptions(
  weights: Partial<DetectionOptions['weights']>,
  isBotThreshold = 0.75
): DetectionOptions {
  const zeroed = Object.fromEntries(
    detection.CHECK_KEYS.map((key) => [key, 0])
  ) as detection.CheckWeights;
  return {
    weights: { ...zeroed, ...weights },
    isBotThreshold,
    dayMs,
  };
}

test('getDetectionReport returns undefined without a tweet', () => {
  expect(detection.getDetectionReport(undefined)).toBe(undefined);
});

test('a typical older account has zero risk and includes all checks', () => {
  const report = getReport(makeTweet());

  expect(report.chance).toBe(0);
  expect(report.isBot).toBe(false);
  expect(report.isBotThreshold).toBe(0.75);
  expect(report.checks.map(({ id }) => id)).toStrictEqual([
    'blue-check',
    'quoted-checkmark',
    'new-account',
    'post-ai-account',
    'account-creation-date',
    'high-tweet-rate',
    'low-followers-ratio',
    'low-followers-following-ratio',
    'auto-handle',
    'onlyfans-model',
    'excessive-promo',
    'bait-persona',
    'crypto-promo',
    'lopsided-following',
    'recent-username-change',
    'ai-characters-bio',
    'no-description',
    'no-banner',
    'default-profile-image',
    'display-name-spam',
    'random-handle',
    'handle-name-mismatch',
    'engagement-mismatch',
    'no-media',
    'spam-links',
    'scam-keywords-bio',
    'generic-reply',
    'mention-hashtag-stuffing',
    'duplicate-text',
    'language-mismatch',
    'protected-account',
    'established-account',
    'official-verified',
  ]);
  expect(
    report.checks.every((item) => !item.triggered && item.contribution === 0)
  ).toBeTruthy();
});

test('invalid account dates and missing counts do not trigger age or rate checks', () => {
  const report = getReport(
    makeTweet({
      created_at: 'not-a-date',
      statuses_count: undefined,
      followers_count: undefined,
      friends_count: undefined,
    })
  );

  expect(report.chance).toBe(0);
  for (const id of [
    'new-account',
    'post-ai-account',
    'account-creation-date',
    'high-tweet-rate',
    'low-followers-ratio',
    'low-followers-following-ratio',
  ]) {
    expect(check(report, id).triggered).toBe(false);
  }
});

test('a non-business verified account triggers the blue-check score', () => {
  const verified = getReport(makeTweet({ is_blue_verified: true }));
  expect(verified.isVerified).toBe(true);
  expect(verified.isVerifiedBusiness).toBe(false);
  expect(check(verified, 'blue-check').triggered).toBe(true);
  expect(check(verified, 'blue-check').contribution).toBe(0.4);

  const business = getReport(
    makeTweet({ verified: true, verified_type: 'Business' })
  );
  expect(business.isVerified).toBe(true);
  expect(business.isVerifiedBusiness).toBe(true);
  expect(check(business, 'blue-check').triggered).toBe(false);
});

test('quote-checkmark only triggers for verified non-business quoted users', () => {
  const quotedReport = getReport(makeTweet({}, { is_blue_verified: true }));
  expect(quotedReport.isQuotedUserVerified).toBe(true);
  expect(quotedReport.didQuoteCheckmark).toBe(true);
  expect(check(quotedReport, 'quoted-checkmark').contribution).toBe(0.05);

  const businessReport = getReport(
    makeTweet(
      {},
      { verified: true, professional: { professional_type: 'Business' } }
    )
  );
  expect(businessReport.isQuotedUserBusiness).toBe(true);
  expect(businessReport.didQuoteCheckmark).toBe(false);
  expect(check(businessReport, 'quoted-checkmark').triggered).toBe(false);
});

test('new-account, post-AI, and calendar-date checks honor their boundaries', () => {
  const at89Days = new Date(fixedNow - 89 * dayMs).toISOString();
  const at90Days = new Date(fixedNow - 90 * dayMs).toISOString();
  expect(
    check(getReport(makeTweet({ created_at: at89Days })), 'new-account')
      .triggered
  ).toBe(true);
  expect(
    check(getReport(makeTweet({ created_at: at90Days })), 'new-account')
      .triggered
  ).toBe(false);

  expect(
    check(
      getReport(makeTweet({ created_at: '2023-01-01T00:00:00.000Z' })),
      'post-ai-account'
    ).triggered
  ).toBe(false);
  expect(
    check(
      getReport(makeTweet({ created_at: '2023-01-02T12:00:00.000Z' })),
      'post-ai-account'
    ).triggered
  ).toBe(true);

  for (const created_at of [
    '2020-06-01T12:00:00.000Z',
    '2020-06-30T12:00:00.000Z',
  ]) {
    expect(
      check(getReport(makeTweet({ created_at })), 'account-creation-date')
        .triggered
    ).toBe(true);
  }
  expect(
    check(
      getReport(makeTweet({ created_at: '2020-06-15T12:00:00.000Z' })),
      'account-creation-date'
    ).triggered
  ).toBe(false);
});

test('high-tweet-rate check requires more than 100 posts per day', () => {
  const created_at = new Date(fixedNow - 10 * dayMs).toISOString();

  expect(
    check(
      getReport(makeTweet({ created_at, statuses_count: 1000 })),
      'high-tweet-rate'
    ).triggered
  ).toBe(false);
  expect(
    check(
      getReport(makeTweet({ created_at, statuses_count: 1001 })),
      'high-tweet-rate'
    ).triggered
  ).toBe(true);
});

test('follower-ratio checks honor their boundaries and separate weights', () => {
  const options = customOptions({
    lowFollowersRatio: 0.01,
    lowFollowerFollowingRatio: 0.04,
  });

  const lowRatio = getReport(
    makeTweet({ followers_count: 9, friends_count: 100 }),
    options
  );
  expect(check(lowRatio, 'low-followers-ratio').triggered).toBe(true);
  expect(check(lowRatio, 'low-followers-ratio').contribution).toBe(0.01);

  const exactLowBoundary = getReport(
    makeTweet({ followers_count: 10, friends_count: 100 }),
    options
  );
  expect(check(exactLowBoundary, 'low-followers-ratio').triggered).toBe(false);

  const equalRatio = getReport(
    makeTweet({ followers_count: 90, friends_count: 100 }),
    options
  );
  expect(check(equalRatio, 'low-followers-following-ratio').triggered).toBe(
    true
  );
  expect(check(equalRatio, 'low-followers-following-ratio').contribution).toBe(
    0.04
  );

  const belowEqualBand = getReport(
    makeTweet({ followers_count: 89, friends_count: 100 }),
    options
  );
  expect(check(belowEqualBand, 'low-followers-following-ratio').triggered).toBe(
    false
  );
  const upperEqualBoundary = getReport(
    makeTweet({ followers_count: 110, friends_count: 100 }),
    options
  );
  expect(
    check(upperEqualBoundary, 'low-followers-following-ratio').triggered
  ).toBe(true);
  const aboveEqualBand = getReport(
    makeTweet({ followers_count: 111, friends_count: 100 }),
    options
  );
  expect(check(aboveEqualBand, 'low-followers-following-ratio').triggered).toBe(
    false
  );
  const insufficientFollowing = getReport(
    makeTweet({ followers_count: 1, friends_count: 99 }),
    options
  );
  expect(check(insufficientFollowing, 'low-followers-ratio').triggered).toBe(
    false
  );
});

test('auto-handle, empty-description, and missing-banner checks are evaluated', () => {
  const report = getReport(
    makeTweet({
      screen_name: 'user12345',
      description: '  ',
      profile_banner_url: '',
    })
  );

  expect(check(report, 'auto-handle').contribution).toBe(0.15);
  expect(check(report, 'no-description').contribution).toBe(0.05);
  expect(check(report, 'no-banner').contribution).toBe(0.05);
});

test('chance sums triggered weights, caps at one, and uses an inclusive threshold', () => {
  const report = getReport(
    makeTweet({
      is_blue_verified: true,
      screen_name: 'user12345',
      description: '',
      profile_banner_url: '',
    }),
    customOptions(
      {
        blueCheck: 0.4,
        autoGeneratedHandle: 0.4,
        noDescription: 0.3,
        noBanner: 0.1,
      },
      1
    )
  );

  expect(report.chance).toBe(1);
  expect(report.isBot).toBe(true);

  const belowThreshold = getReport(
    makeTweet({ is_blue_verified: true }),
    customOptions({ blueCheck: 0.5 }, 0.5001)
  );
  expect(belowThreshold.chance).toBe(0.5);
  expect(belowThreshold.isBot).toBe(false);
});

test('chance equals the threshold counts as a bot, and extreme thresholds behave', () => {
  const verified = makeTweet({ is_blue_verified: true });

  const atThreshold = getReport(
    verified,
    customOptions({ blueCheck: 0.5 }, 0.5)
  );
  expect(atThreshold.chance).toBe(0.5);
  expect(atThreshold.isBot).toBe(true);

  expect(getReport(makeTweet(), customOptions({}, 0)).isBot).toBe(true);

  const maxed = getReport(verified, customOptions({ blueCheck: 2 }, 1.01));
  expect(maxed.chance).toBe(1);
  expect(maxed.isBot).toBe(false);
});

test('default options are used when none are provided', () => {
  for (const options of [
    undefined,
    detection.DEFAULT_DETECTION_REPORT_OPTIONS,
  ]) {
    const report = getReport(makeTweet(), options);
    expect(report.isBotThreshold).toBe(0.75);
    expect(
      report.checks.every(
        (item) => Number.isFinite(item.weight) && item.weight !== 0
      )
    ).toBeTruthy();
  }
});

test('a triggered check with a zero weight adds nothing to the score', () => {
  const report = getReport(
    makeTweet({ is_blue_verified: true }),
    customOptions({ blueCheck: 0 })
  );

  expect(check(report, 'blue-check').triggered).toBe(true);
  expect(check(report, 'blue-check').contribution).toBe(0);
  expect(report.chance).toBe(0);
});

test('report invariants hold for a range of accounts', () => {
  const accounts = [
    makeTweet(),
    makeTweet({ is_blue_verified: true }),
    makeTweet({
      screen_name: 'bot123456',
      description: '',
      profile_banner_url: '',
    }),
    makeTweet({ created_at: new Date(fixedNow - 5 * dayMs).toISOString() }),
    makeTweet({ followers_count: 5, friends_count: 500 }),
    makeTweet(
      { description: 'my onlyfans', is_blue_verified: true },
      { verified: true }
    ),
    makeTweet({ created_at: 'garbage', followers_count: undefined }),
  ];

  for (const tweet of accounts) {
    const report = getReport(tweet);
    const sum = report.checks.reduce(
      (total, item) => total + item.contribution,
      0
    );

    for (const item of report.checks) {
      expect(item.contribution).toBe(item.triggered ? item.weight : 0);
    }
    expect(report.chance).toBe(Math.min(Math.max(sum, 0), 1));
    expect(report.chance >= 0 && report.chance <= 1).toBeTruthy();
    expect(report.isBot).toBe(report.chance >= report.isBotThreshold);
    expect(new Set(report.checks.map((item) => item.id)).size).toBe(
      report.checks.length
    );
  }
});

test('an account with many red flags is capped at 100% and marked as a bot', () => {
  const report = getReport(
    makeTweet({
      is_blue_verified: true,
      created_at: new Date(fixedNow - 10 * dayMs).toISOString(),
      statuses_count: 5000,
      followers_count: 5,
      friends_count: 500,
      screen_name: 'bot123456',
      description: '',
      profile_banner_url: '',
    })
  );

  const sum = report.checks.reduce(
    (total, item) => total + item.contribution,
    0
  );
  expect(sum > 1).toBeTruthy();
  expect(report.chance).toBe(1);
  expect(report.isBot).toBe(true);
});

test('verification flags are read from either verified or blue-verified', () => {
  const legacy = getReport(makeTweet({ verified: true }));
  expect(legacy.isVerified).toBe(true);
  expect(check(legacy, 'blue-check').triggered).toBe(true);

  const unverified = getReport(makeTweet());
  expect(unverified.isVerified).toBe(false);
  expect(check(unverified, 'blue-check').triggered).toBe(false);

  const professional = getReport(
    makeTweet({
      is_blue_verified: true,
      professional: { professional_type: 'Business' },
    })
  );
  expect(professional.isVerifiedBusiness).toBe(true);
  expect(check(professional, 'blue-check').triggered).toBe(false);

  const typed = getReport(
    makeTweet({ verified: true, verified_type: 'Business' })
  );
  expect(typed.verifiedType).toBe('Business');
});

test('quote-checkmark ignores missing, unverified, and typed quoted users', () => {
  const noQuote = getReport(makeTweet());
  expect(noQuote.isQuotedUserVerified).toBe(false);
  expect(noQuote.didQuoteCheckmark).toBe(false);
  expect(noQuote.quotedUserVerifiedType).toBe(undefined);

  const unverifiedQuote = getReport(makeTweet({}, { verified: false }));
  expect(unverifiedQuote.didQuoteCheckmark).toBe(false);

  const governmentQuote = getReport(
    makeTweet({}, { verified: true, verified_type: 'Government' })
  );
  expect(governmentQuote.isQuotedUserVerified).toBe(true);
  expect(governmentQuote.quotedUserVerifiedType).toBe('Government');
  expect(governmentQuote.didQuoteCheckmark).toBe(false);
});

test('account-creation-date handles leap years and month lengths', () => {
  const triggered = (created_at: string) =>
    check(getReport(makeTweet({ created_at })), 'account-creation-date')
      .triggered;

  expect(triggered('2024-02-29T12:00:00.000Z')).toBe(true);
  expect(triggered('2024-02-28T12:00:00.000Z')).toBe(false);
  expect(triggered('2023-02-28T12:00:00.000Z')).toBe(true);
  expect(triggered('2023-02-27T12:00:00.000Z')).toBe(false);
  expect(triggered('2020-01-31T12:00:00.000Z')).toBe(true);
  expect(triggered('2020-04-30T12:00:00.000Z')).toBe(true);
  expect(triggered('2020-04-29T12:00:00.000Z')).toBe(false);
});

test('very new or future-dated accounts are treated as one day old', () => {
  const future = new Date(fixedNow + 5 * dayMs).toISOString();
  const futureReport = getReport(makeTweet({ created_at: future }));
  expect(check(futureReport, 'new-account').triggered).toBe(true);

  const now = new Date(fixedNow).toISOString();
  const rate = (statuses_count: number) =>
    check(
      getReport(makeTweet({ created_at: now, statuses_count })),
      'high-tweet-rate'
    ).triggered;
  expect(rate(100)).toBe(false);
  expect(rate(101)).toBe(true);
});

test('low-followers-ratio handles zero followers and requires 100 following', () => {
  const lowRatio = (followers_count: number, friends_count: number) =>
    check(
      getReport(makeTweet({ followers_count, friends_count })),
      'low-followers-ratio'
    ).triggered;

  expect(lowRatio(0, 100)).toBe(true);
  expect(lowRatio(0, 99)).toBe(false);
  expect(lowRatio(0, 0)).toBe(false);
});

test('auto-handle only matches long digit runs at the end of the handle', () => {
  const triggered = (screen_name: string | undefined) =>
    check(getReport(makeTweet({ screen_name })), 'auto-handle').triggered;

  expect(triggered('user12345')).toBe(true);
  expect(triggered('user123456789')).toBe(true);
  expect(triggered('12345')).toBe(true);
  expect(triggered('user12345x')).toBe(false);
  expect(triggered('12345_user')).toBe(false);
  expect(triggered('plain_user')).toBe(false);
  expect(triggered(undefined)).toBe(false);
});

test('missing description and banner trigger their checks without throwing', () => {
  const report = getReport(
    makeTweet({ description: undefined, profile_banner_url: undefined })
  );

  expect(check(report, 'no-description').triggered).toBe(true);
  expect(check(report, 'no-banner').triggered).toBe(true);
  expect(check(report, 'onlyfans-model').triggered).toBe(false);
});

test('excessive-promo matches accounts that excessively promote content', () => {
  const tweets = [
    makeTweet({
      location: '👉🏽',
    }),
    makeTweet({
      location: '👉',
    }),
    makeTweet({
      location: 'It’s free👉🏽',
    }),
    makeTweet({
      location: 'Click here 👉',
    }),
    makeTweet({
      location: 'Link 👉',
    }),
    makeTweet({
      location: 'OF👉',
    }),
    makeTweet({
      location: '👉🏽👉🏽👉🏽',
    }),
    makeTweet({
      location: '👉🏽👉👉🏽👉🏽',
    }),
  ];
  for (const tweet of tweets) {
    const report = getReport(tweet);
    expect(check(report, 'excessive-promo').triggered).toBe(true);
  }
});

test('onlyfans-model matches the keyword case-insensitively and uses its weight', () => {
  for (const description of [
    'OnlyFans',
    'ONLYFANS 🔥',
    'check my onlyfans link',
  ]) {
    const report = getReport(makeTweet({ description }));
    expect(check(report, 'onlyfans-model').triggered).toBe(true);
    expect(check(report, 'onlyfans-model').contribution).toBe(0.2);
  }

  for (const description of ['I love football', 'only fans of the team?']) {
    const report = getReport(makeTweet({ description }));
    expect(check(report, 'onlyfans-model').triggered).toBe(false);
  }
});

test('onlyfans models are detected', () => {
  const knownPornScamLinks = ['spicey.link', 'onlyfans.com'];

  // need to check not only in bio, but also names and other info too

  const tweets = [
    makeTweet({
      description: 'Check out my OnlyFans!',
    }),
    makeTweet({
      description: 'OF: https://spicey.link',
    }),
    makeTweet({
      description: 'of: https://otherlink.com',
    }),
    makeTweet({
      description: '0n1yF4n5',
    }),
    makeTweet({
      name: 'Jane | OnlyFans',
    }),
    makeTweet({
      description: 'subscribe at fansly.com/jane',
    }),
  ];

  for (const tweet of tweets) {
    const report = getReport(tweet);
    expect(check(report, 'onlyfans-model').triggered).toBe(true);
  }
});

test('onlyfans detection avoids common false positives', () => {
  const clean = [
    { description: 'Big fan of the Of Mice and Men: the book' },
    { description: 'I am 15 years old, 10 cats', location: 'Ohio' },
    { description: 'Left 👉 or right', location: 'Paris' },
    { description: 'kind of: a person' },
  ];
  for (const user of clean) {
    const report = getReport(makeTweet(user));
    expect(check(report, 'onlyfans-model').triggered).toBe(false);
  }
});

test('government-verified accounts are not paid blue checks', () => {
  const report = getReport(
    makeTweet({ verified: true, verified_type: 'Government' })
  );
  expect(check(report, 'blue-check').triggered).toBe(false);
});

test('ai-characters-bio ignores plain keyboard punctuation', () => {
  const report = getReport(
    makeTweet({ description: 'It\'s plain - text... "quoted" -> ok' })
  );
  expect(check(report, 'ai-characters-bio').triggered).toBe(false);
});

test('ai characters in user bio', () => {
  // em-dashes, elipses, and anything else not readily available on a standard physical keyboard

  const tweets = [
    makeTweet({
      description: 'Em dash —',
    }),
    makeTweet({
      description: 'Ellipsis …',
    }),
    makeTweet({
      description: 'U+2019 ’ (mistaken for a straight quote)',
    }),
    makeTweet({
      description: 'Right Arrow →',
    }),
    makeTweet({
      description: 'Left Arrow ←',
    }),
    makeTweet({
      description: 'Up Arrow ↑',
    }),
    makeTweet({
      description: 'Down Arrow ↓',
    }),
  ];

  for (const tweet of tweets) {
    const report = getReport(tweet);
    expect(check(report, 'ai-characters-bio').triggered).toBe(true);
  }
});

describe('additional checks', () => {
  const tweetWith = (
    fields: Record<string, unknown>,
    user: Record<string, unknown> = {}
  ) => ({ ...makeTweet(user), ...fields }) as Tweet;
  const triggered = (tweet: Tweet, id: string, options?: DetectionOptions) =>
    check(getReport(tweet, options), id).triggered;

  test('none of the new checks fire on an ordinary account', () => {
    const report = getReport(makeTweet());
    expect(report.checks.filter((c) => c.triggered)).toStrictEqual([]);
  });

  test('default-profile-image', () => {
    const url = (v: string) => makeTweet({ profile_image_url_https: v });
    expect(
      triggered(
        url('https://abs.twimg.com/sticky/default_profile_images/x.png'),
        'default-profile-image'
      )
    ).toBe(true);
    expect(
      triggered(
        url('https://pbs.twimg.com/profile_images/1/a.jpg'),
        'default-profile-image'
      )
    ).toBe(false);
  });

  test('display-name-spam, random-handle and handle-name-mismatch', () => {
    expect(
      triggered(makeTweet({ name: 'Jess DM me 🔥' }), 'display-name-spam')
    ).toBe(true);
    expect(
      triggered(makeTweet({ screen_name: 'xk29dj44' }), 'random-handle')
    ).toBe(true);
    expect(
      triggered(
        makeTweet({ name: 'Emma Rose', screen_name: 'kj83821' }),
        'handle-name-mismatch'
      )
    ).toBe(true);
  });

  test('engagement-mismatch and no-media need an active account', () => {
    expect(
      triggered(
        makeTweet({ statuses_count: 5000, favourites_count: 2 }),
        'engagement-mismatch'
      )
    ).toBe(true);
    expect(
      triggered(
        makeTweet({ statuses_count: 50, favourites_count: 2 }),
        'engagement-mismatch'
      )
    ).toBe(false);
    expect(
      triggered(makeTweet({ statuses_count: 1000, media_count: 0 }), 'no-media')
    ).toBe(true);
    expect(
      triggered(makeTweet({ statuses_count: 10, media_count: 0 }), 'no-media')
    ).toBe(false);
  });

  test('spam-links and scam-keywords-bio, including custom keywords', () => {
    expect(
      triggered(makeTweet({ description: 'DM t.me/promo' }), 'spam-links')
    ).toBe(true);
    expect(
      triggered(
        makeTweet({ description: 'Free AIRDROP inside' }),
        'scam-keywords-bio'
      )
    ).toBe(true);

    const bio = makeTweet({ description: 'my secret sauce' });
    expect(triggered(bio, 'scam-keywords-bio')).toBe(false);
    expect(
      triggered(bio, 'scam-keywords-bio', {
        ...detection.DEFAULT_DETECTION_REPORT_OPTIONS,
        scamKeywords: ['secret sauce'],
      })
    ).toBe(true);
  });

  test('post-level checks read the tweet text and language', () => {
    expect(
      triggered(
        tweetWith({ full_text: '@a Nice!', in_reply_to_status_id_str: '1' }),
        'generic-reply'
      )
    ).toBe(true);
    expect(
      triggered(
        tweetWith({ full_text: '#a #b #c #d #e' }),
        'mention-hashtag-stuffing'
      )
    ).toBe(true);
    expect(
      triggered(
        tweetWith({ lang: 'en' }, { profile_description_language: 'ja' }),
        'language-mismatch'
      )
    ).toBe(true);
  });

  test('duplicate-text depends on the supplied count', () => {
    const options = (duplicateTextCount: number): DetectionOptions => ({
      ...detection.DEFAULT_DETECTION_REPORT_OPTIONS,
      duplicateTextCount,
    });
    expect(triggered(makeTweet(), 'duplicate-text', options(1))).toBe(false);
    expect(triggered(makeTweet(), 'duplicate-text', options(2))).toBe(true);
  });

  test('trust signals lower the score and never push it below zero', () => {
    const old = {
      created_at: '2015-03-10T12:00:00.000Z',
      followers_count: 500,
      statuses_count: 5000,
    };
    const report = getReport(makeTweet({ ...old, protected: true }));
    expect(check(report, 'protected-account').contribution).toBeLessThan(0);
    expect(check(report, 'established-account').triggered).toBe(true);
    expect(report.chance).toBe(0);

    const official = getReport(
      makeTweet({ verified: true, verified_type: 'Government' })
    );
    expect(check(official, 'official-verified').triggered).toBe(true);
    expect(check(official, 'blue-check').triggered).toBe(false);

    const lowered = getReport(makeTweet({ is_blue_verified: true, ...old }));
    expect(lowered.chance).toBeCloseTo(0.3);
  });

  test('every check key has a definition and a default weight', () => {
    expect(detection.CHECK_KEYS.length).toBeGreaterThan(20);
    for (const key of detection.CHECK_KEYS) {
      expect(Number.isFinite(detection.DEFAULT_WEIGHTS[key])).toBe(true);
    }
    const ids = detection.CHECK_KEYS.map(
      (k) => detection.CHECK_DEFINITIONS[k].id
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('profile promotion and account history checks', () => {
  test('an expanded t.co profile link to an adult site triggers onlyfans-model', () => {
    const tweet = makeTweet({ url: 'https://t.co/abc123' });
    expect(check(getReport(tweet), 'onlyfans-model').triggered).toBe(false);

    const report = getReport(tweet, {
      ...detection.DEFAULT_DETECTION_REPORT_OPTIONS,
      expandedLinks: { 'https://t.co/abc123': 'https://onlyfans.com/x' },
    });
    expect(check(report, 'onlyfans-model').triggered).toBe(true);
  });

  test('arrows in the location or a bio call to action trigger excessive-promo', () => {
    expect(
      check(
        getReport(makeTweet({ location: 'more here →' })),
        'excessive-promo'
      ).triggered
    ).toBe(true);
    expect(
      check(
        getReport(makeTweet({ description: 'exclusive pics ↙' })),
        'excessive-promo'
      ).triggered
    ).toBe(true);
    expect(
      check(getReport(makeTweet({ location: 'Paris' })), 'excessive-promo')
        .triggered
    ).toBe(false);
  });

  test('bait personas and crypto bios trigger', () => {
    expect(
      check(
        getReport(makeTweet({ description: 'goth baddie' })),
        'bait-persona'
      ).triggered
    ).toBe(true);
    expect(
      check(
        getReport(makeTweet({ description: 'Bitcoin and sats' })),
        'crypto-promo'
      ).triggered
    ).toBe(true);
  });

  test('lopsided following ignores official accounts', () => {
    const lopsided = { followers_count: 20000, friends_count: 10 };
    expect(
      check(getReport(makeTweet(lopsided)), 'lopsided-following').triggered
    ).toBe(true);
    expect(
      check(
        getReport(makeTweet({ ...lopsided, verified_type: 'Government' })),
        'lopsided-following'
      ).triggered
    ).toBe(false);
  });

  test('a recent or repeated username change triggers', () => {
    const changes = (count: string, lastChangedAt: number) =>
      makeTweet({
        about_profile: {
          username_changes: {
            count,
            last_changed_at_msec: String(lastChangedAt),
          },
        },
      });

    expect(
      check(
        getReport(changes('1', fixedNow - 30 * dayMs)),
        'recent-username-change'
      ).triggered
    ).toBe(true);
    expect(
      check(
        getReport(changes('1', fixedNow - 800 * dayMs)),
        'recent-username-change'
      ).triggered
    ).toBe(false);
    expect(
      check(
        getReport(changes('3', fixedNow - 800 * dayMs)),
        'recent-username-change'
      ).triggered
    ).toBe(true);
    expect(
      check(getReport(makeTweet()), 'recent-username-change').triggered
    ).toBe(false);
  });

  test('a professional (non-org) business profile is not an official-verified trust signal', () => {
    const report = getReport(
      makeTweet({
        is_blue_verified: true,
        professional: { professional_type: 'Business' },
      })
    );
    expect(check(report, 'official-verified').triggered).toBe(false);
  });
});
