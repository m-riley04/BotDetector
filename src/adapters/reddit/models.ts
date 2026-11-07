interface Subreddit {
  accept_followers: boolean;
  allowed_media_in_comments: unknown[];
  banner_img: string;
  banner_size: number[]; // [width, height]
  community_icon: unknown | null;
  default_set: boolean;
  description: string;
  disable_contributor_requests: boolean;
  display_name_prefixed: string;
  display_name: string;
  free_form_reports: boolean;
  header_img: unknown | null;
  header_size: unknown | null;
  icon_color: string;
  icon_img: string;
  icon_size: number[];
  is_default_banner: boolean;
  is_default_icon: boolean;
  key_color: string;
  link_flair_enabled: boolean;
  link_flair_position: string;
  name: string;
  over_18: boolean;
  previous_names: unknown[];
  primary_color: string;
  public_description: string;
  quarantine: boolean;
  restrict_commenting: boolean;
  restrict_posting: boolean;
  show_media: boolean;
  submit_link_label: string;
  submit_text_label: string;
  subreddit_type: 'user' | string;
  subscribers: number;
  title: string;
  url: string;
  user_is_banned: boolean;
  user_is_contributor: boolean;
  user_is_moderator: boolean;
  user_is_muted: boolean | null;
  user_is_subscriber: boolean;
}

interface UserData {
  accept_chats: boolean;
  accept_followers: boolean;
  accept_pms: boolean;
  awardee_karma: number;
  awarder_karma: number;
  comment_karma: number;
  created_utc: number;
  created: number;
  has_subscribed: boolean;
  has_verified_email: boolean;
  hide_from_robots: boolean;
  icon_img: string;
  id: string;
  is_blocked: boolean;
  is_employee: boolean;
  is_friend: boolean;
  is_gold: boolean;
  is_mod: boolean;
  link_karma: number;
  name: string;
  pref_show_snoovatar: boolean;
  snoovatar_img: string;
  snoovatar_size: number[];
  subreddit: Subreddit;
  total_karma: number;
  verified: boolean;
}

export interface RedditUser {
  kind: 't2' | string;
  data: UserData;
}

export interface RedditComment {
  id: string;
  author: string;
  authorId: string;
  parent: string;
  depth: number;
  score: number;
  created: string;
  body?: string;
}
