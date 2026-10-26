interface UserLinks {
  urls: string[];
  description?: string;
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
  followers?: number;
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

type UserProfilePictureShape = 'circle' | 'square' | 'other';

interface UserProfileElements {
  bannerUrl?: string;
  imageUrl?: string;
  imageShape?: UserProfilePictureShape;
}

interface UserProfileAbout {
  usernameChanges?: number;
  lastUsernameChange?: Date;
  createdAt: Date;
}

interface UserProfile {
  id: string;

  /**
   * i.e. screenname
   */
  username: string;

  displayName: string;
  bio?: string;
  bioLanguage?: string;
  links: UserLinks;
  location?: string;
  pinnedPostIds?: string[];
  labels: UserLabels;
  stats: UserStatistics;
  profileElements?: UserProfileElements;
  url?: string;
  about: UserProfileAbout;
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
  text?: string;
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
  inReplyToPostId?: string;

  /**
   * i.e. quote tweet
   */
  repost?: Post;
}
