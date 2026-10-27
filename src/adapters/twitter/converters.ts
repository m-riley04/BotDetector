import { isRecord, isString } from '../../common/helpers';
import { Post } from '../../social-media/models';
import type { Tweet } from './models';

export function isTwitterTweet(value: unknown): value is Tweet {
  return (
    isRecord(value) &&
    isString(value.id_str) &&
    isRecord(value.user) &&
    isString(value.user.id_str)
  );
}

type GenericProfilePictureShape = NonNullable<
  Post['user']['profileElements']
>['imageShape'];
function convertTwitterProfilePictureShapeToGeneric(
  shape: Tweet['user']['profile_image_shape'] | undefined
): GenericProfilePictureShape {
  switch (shape) {
    case 'Circle':
      return 'circle';
    case 'Square':
      return 'square';
    default:
      return 'other';
  }
}

function convertTwitterUserToGenericUser(user: Tweet['user']): Post['user'] {
  const isBusinessProfile =
    user.verified_type === 'Business' ||
    user.professional?.professional_type === 'Business';
  const urls =
    user.entities?.url?.urls
      .map((entry) => entry.expanded_url ?? entry.url)
      .filter((url): url is string => Boolean(url)) ?? [];

  return {
    id: user.id_str,
    displayName: user.name ?? '',
    username: user.screen_name ?? '',
    bio: user.description,
    bioLanguage: user.profile_description_language,
    labels: {
      isPrivate: user.protected,
      isSensitive: user.possibly_sensitive,
      isVerified: user.verified,
      isPlus: user.is_blue_verified,
      isBusiness: isBusinessProfile,
      isGovernment: user.verified_type === 'Government',
    },
    stats: {
      followers: user.followers_count,
      following: user.friends_count,
      subscriptionsGiven: user.creator_subscriptions_count,
      postStats: {
        likesGiven: user.favourites_count,
        posts: user.statuses_count,
        media: user.media_count,
      },
    },
    location: user.location,
    links: { urls },
    pinnedPostIds: user.pinned_tweet_ids,
    url: user.url,
    profileElements: {
      bannerUrl: user.profile_banner_url,
      imageUrl: user.profile_image_url_https,
      imageShape: convertTwitterProfilePictureShapeToGeneric(
        user.profile_image_shape
      ),
    },
    about: {
      createdAt: new Date(user.created_at ?? Number.NaN),
      usernameChanges: undefined, // TODO: twitter does not give this in the react component. Need a way to get this another way.
      lastUsernameChange: undefined, // TODO: twitter does not give this in the react component. Need a way to get this another way.
    },
  };
}

function convertTwitterMediaTypeToGeneric(
  type: unknown
): NonNullable<Post['content']['media']>[number]['type'] {
  switch (type) {
    case 'photo':
      return 'photo';
    case 'video':
      return 'video';
    case 'gif':
    case 'animated_gif':
      return 'gif';
    default:
      return 'other';
  }
}

function convertTwitterMediaToGenericMedia(
  media: NonNullable<Tweet['entities']>['media']
): Post['content']['media'] {
  return media?.flatMap((item) =>
    item.url
      ? [
          {
            url: item.url,
            type: convertTwitterMediaTypeToGeneric(item.type),
            size: item.original_info
              ? {
                  height: item.original_info.height,
                  width: item.original_info.width,
                }
              : undefined,
          },
        ]
      : []
  );
}

export function convertTweetToGenericPost(tweet: Tweet): Post {
  const text = tweet.text ?? '';
  const fullText = tweet.full_text ?? '';
  const media = tweet.entities?.media ?? tweet.extended_entities?.media;

  return {
    id: tweet.id_str,
    user: convertTwitterUserToGenericUser(tweet.user),
    content: {
      text: text.length > fullText.length ? text : fullText,
      media: convertTwitterMediaToGenericMedia(media),
    },
    createdAt: new Date(tweet.created_at ?? Number.NaN),
    language: tweet.lang ?? '',
    link: tweet.permalink,
    inReplyToPostId: tweet.in_reply_to_status_id_str,
    repost: tweet.quoted_status
      ? convertTweetToGenericPost(tweet.quoted_status)
      : undefined,
    statistics: {
      likes: tweet.favorite_count ?? 0,
      comments: tweet.reply_count,
      bookmarks: tweet.bookmark_count,
      reposts: tweet.quote_count,
      views: tweet.views?.count,
    },
    raw: tweet,
  };
}
