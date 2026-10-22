import {
  convertTweetToGenericPost,
  isTwitterTweet,
} from '../src/adapters/twitter/converters';
import type { Tweet } from '../src/adapters/twitter/models';

test('isTwitterTweet accepts minimal payloads and rejects malformed props', () => {
  expect(isTwitterTweet({ id_str: '1', user: { id_str: 'u1' } })).toBe(true);
  for (const value of [
    undefined,
    null,
    [],
    {},
    { id_str: 1, user: { id_str: 'u1' } },
    { id_str: '1', user: null },
    { id_str: '1', user: { id_str: 1 } },
  ]) {
    expect(isTwitterTweet(value)).toBe(false);
  }
});

test('converts partial tweets and preserves generic detection fields', () => {
  const tweet: Tweet = {
    id_str: 'post-1',
    created_at: '2026-10-18T16:07:39.000Z',
    full_text: 'full text',
    text: 'text',
    lang: 'en',
    in_reply_to_status_id_str: 'parent-1',
    user: {
      id_str: 'user-1',
      created_at: '2022-11-18T14:29:51.000Z',
      screen_name: 'sample_user',
      name: 'Sample User',
      description: 'Profile bio',
      profile_description_language: 'ja',
      verified: false,
      is_blue_verified: true,
      verified_type: 'Business',
      protected: true,
      followers_count: 10,
      friends_count: 50,
      statuses_count: 1000,
      favourites_count: 25,
      media_count: 3,
      profile_banner_url: 'https://example.test/banner.jpg',
      profile_image_url_https: 'https://example.test/image.jpg',
      profile_image_shape: 'Square',
      about_profile: {
        username_changes: {
          count: '2',
          last_changed_at_msec: '1700000000000',
        },
      },
    },
  };

  const post = convertTweetToGenericPost(tweet);
  expect(post).toMatchObject({
    id: 'post-1',
    content: { text: 'full text' },
    language: 'en',
    inReplyToPostId: 'parent-1',
    user: {
      id: 'user-1',
      username: 'sample_user',
      bio: 'Profile bio',
      bioLanguage: 'ja',
      labels: {
        isPlus: true,
        isBusiness: true,
        isPrivate: true,
      },
      stats: {
        followers: 10,
        following: 50,
        postStats: {
          likesGiven: 25,
          posts: 1000,
          media: 3,
        },
      },
      profileElements: {
        bannerUrl: 'https://example.test/banner.jpg',
        imageUrl: 'https://example.test/image.jpg',
        imageShape: 'square',
      },
      // about: {
      //   usernameChanges: 2,
      //   lastUsernameChange: new Date(1700000000000),
      // },
    },
  });
  expect(post?.user.about.createdAt).toEqual(
    new Date('2022-11-18T14:29:51.000Z')
  );
});

test('missing optional tweet fields do not prevent conversion', () => {
  const post = convertTweetToGenericPost({
    id_str: 'minimal',
    user: { id_str: 'user' },
  });

  expect(post?.id).toBe('minimal');
  expect(post?.content.text).toBe('');
  expect(post?.content.media).toBeUndefined();
  expect(post?.statistics?.likes).toBe(0);
  expect(post?.statistics?.views).toBeUndefined();
  expect(post?.user.stats.followers).toBeUndefined();
  expect(Number.isNaN(post?.user.about.createdAt.getTime())).toBe(true);
});

test('uses extended media when normal entities do not include it', () => {
  const post = convertTweetToGenericPost({
    id_str: 'post',
    user: { id_str: 'user' },
    extended_entities: {
      media: [
        {
          url: 'https://example.test/media.jpg',
          type: 'photo',
          original_info: { width: 640, height: 480 },
        },
      ],
    },
  });

  expect(post?.content.media).toEqual([
    {
      url: 'https://example.test/media.jpg',
      type: 'photo',
      size: { width: 640, height: 480 },
    },
  ]);
});

test('converts legacy verified and government accounts separately', () => {
  const post = convertTweetToGenericPost({
    id_str: 'post',
    user: {
      id_str: 'user',
      verified: true,
      verified_type: 'Government',
    },
  });

  expect(post?.user.labels.isVerified).toBe(true);
  expect(post?.user.labels.isPlus).toBeUndefined();
  expect(post?.user.labels.isGovernment).toBe(true);
});
