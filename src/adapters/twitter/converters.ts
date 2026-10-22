import { Post } from '../../social-media/models';
import type { Tweet } from './models';

function convertTwitterUserToGenericUser(user: Tweet['user']): Post['user'] {
  return {
    id: user.id_str,
    displayName: user.name,
    username: user.screen_name,
    bio: user.description,
    labels: {
      isPrivate: user.protected,
      isSensitive: user.possibly_sensitive,
      isVerified: user.verified,
      // TODO: continue adding these
    },
    stats: {
      followers: user.followers_count,
      following: user.friends_count,
      subscriptionsGiven: user.creator_subscriptions_count,
      subscriptionsReceived: undefined,
      postStats: {
        likesReceived: user.favourites_count, // TODO: make sure this is the likes that the user received, NOT likes they have received
        posts: user.statuses_count, // TODO: make sure this is the right conversion
        media: user.media_count,
      },
    },
    location: user.location,
    links: {
      urls:
        user.entities?.url?.urls
          ?.filter((entry) => entry.expanded_url || entry.url)
          .map((entry) => entry.expanded_url ?? entry.url ?? '')
          .filter((url) => url !== '') ?? [],
      description: undefined, // TODO:
    },
    pinnedPostIds: user.pinned_tweet_ids,
    url: user.url,
    about: {
      createdAt: new Date(user.created_at),
      lastUsernameChange: undefined, // TODO:
      usernameChanges: undefined, // TODO:
    },
  };
}

function convertTwitterMediaTypeToGeneric(
  type: NonNullable<Tweet['entities']['media']>[0]['type']
): NonNullable<Post['content']['media']>[0]['type'] {
  switch (type) {
    case 'photo':
      return 'photo';
    case 'video':
      return 'video';
    case 'gif':
      return 'gif';
    default:
      return 'other';
  }
}

function convertTwitterMediaToGenericMedia(
  media: Tweet['entities']['media']
): Post['content']['media'] {
  const converted: Post['content']['media'] = media?.map((twMedia) => {
    return {
      url: twMedia.url,
      type: convertTwitterMediaTypeToGeneric(twMedia.type),
      size: {
        height: twMedia.original_info.height,
        width: twMedia.original_info.width,
      },
    };
  });
  return converted;
}

export function convertTweetToGenericPost(tweet?: Tweet): Post | undefined {
  if (!tweet) return;

  const post: Post = {
    id: tweet.id_str,
    user: convertTwitterUserToGenericUser(tweet.user),
    content: {
      text:
        // get the most amount of content
        tweet.text.length > tweet.full_text.length
          ? tweet.text
          : tweet.full_text,
      media: convertTwitterMediaToGenericMedia(tweet.entities.media),
    },
    createdAt: new Date(tweet.created_at),
    language: tweet.lang,
    link: tweet.permalink,
    repost: convertTweetToGenericPost(tweet.quoted_status),
    statistics: {
      likes: tweet.favorite_count,
      comments: tweet.reply_count,
      bookmarks: tweet.bookmark_count,
      reposts: tweet.quote_count,
      views: tweet.views.count,
      dislikes: undefined, // no dislikes on twitter
      shares: undefined, // not given in react props
    },
    updatedAt: undefined, // TODO: not given on twitter from what I've seen
  };

  return post;
}
