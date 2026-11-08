import { isRecord, isString } from '../../common/helpers';
import { Post } from '../../social-media/models';
import type { RedditComment, RedditUser } from './models';

export function isRedditUser(value: unknown): value is RedditUser {
  return (
    isRecord(value) &&
    isString(value.id_str) &&
    isRecord(value.user) &&
    isString(value.user.id_str)
  );
}

export function convertRedditUserToGenericUser(user: RedditUser): Post['user'] {
  return {
    id: user.data.id,
    displayName: user.data.subreddit.display_name ?? '',
    username: user.data.name ?? '',
    bio: user.data.subreddit.description,
    bioLanguage: undefined, // not given by about.json
    labels: {
      isPrivate: user.data.hide_from_robots, // TODO: make sure this is accurate
      isMarkedAdult: user.data.subreddit.over_18, // TODO: this is the nsfw setting I think
      isSensitive: undefined,
      isVerified: user.data.verified,
      isPlus: undefined,
    },
    stats: {
      followers: user.data.subreddit.subscribers,
      postStats: {
        likesReceived: user.data.total_karma,
      },
    },
    links: { urls: [] },
    url: `https://reddit.com${user.data.subreddit.url}`,
    profileElements: {
      bannerUrl: user.data.subreddit.banner_img,
      imageUrl: user.data.icon_img,
    },
    about: {
      createdAt: new Date(user.data.created ?? Number.NaN),
      usernameChanges: user.data.subreddit.previous_names?.length,
      lastUsernameChange: undefined,
    },
  };
}

export function convertRedditCommentToGenericPost(post: RedditComment): Post {
  return {
    id: post.id,
    user: undefined, // convertRedditUserToGenericUser(post.user), // TODO: MAKE THIS ASYNCHRONOUS
    content: {
      text: post.body,
    },
    createdAt: new Date(post.created ?? Number.NaN),
    inReplyToPostId: post.parent,
    statistics: {
      likes: post.score,
    },
    raw: post,
  };
}
