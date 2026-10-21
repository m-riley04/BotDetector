interface UserLink {
  url: string;
}

interface UserPostStats {
  posts?: number;
  likesReceived?: number;
  likesGiven?: number;
  commentsReceived?: number;
  commentsGiven?: number;
  reposts?: number;
  media?: number;
}

interface UserStatistics {
  followers: number;
  following?: number;
  subscriptionsReceived?: number;
  subscriptionsGiven?: number;
  postStats: UserPostStats;
  businessStats?: UserBusinessStats;
}

interface UserBusinessStats {
  affiliates?: number;
}

interface UserLabels {
  isParody?: boolean;
  isBusiness?: boolean;
  isSensitive?: boolean;

  /**
   * Proper verification from admins
   */
  isVerified?: boolean;

  /**
   * i.e. Twitter Blue, YouTube Red
   */
  isPlus?: boolean;

  isPrivate?: boolean;
  isAutomated?: boolean;
  isGovernment?: boolean;
}

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  links: UserLink[];
  location?: string;
  createdAt: Date;
  pinnedPostIds?: string[];
  labels: UserLabels;
  stats: UserStatistics;
}

interface MediaSize {
  width: number;
  height: number;
}

type MediaType = 'photo' | 'video' | 'audio' | 'gif' | 'other';

interface Media {
  url: string;
  size?: MediaSize;
  type: MediaType;
}

interface Content {
  text: string;
  media?: Media[];
}

interface PostStatistics {
  likes: number;
  dislikes?: number;
  comments?: number;
  shares?: number;
  reposts?: number;
  bookmarks?: number;
  views?: number;
}

export interface Post {
  id: string;
  user: UserProfile;
  content: Content;
  statistics?: PostStatistics;
  createdAt: Date;
  language: string;
  link?: string;
  updatedAt?: Date;

  /**
   * i.e. quote tweet
   */
  repost?: Post;
}
