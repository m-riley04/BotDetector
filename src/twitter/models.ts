import { ProfessionalType, VerifiedType } from './types';

interface EditControl {
  edit_tweet_ids: string[];
  editable_until_msecs: string;
  edits_remaining: string;
  is_edit_eligible: boolean;
  [k: string]: unknown;
}

interface GrokAnnotations {
  is_image_editable_by_grok: boolean;
  [k: string]: unknown;
}

interface UserDescriptionEntity {
  [k: string]: unknown;
}

interface UserEntities {
  description: UserDescriptionEntity;
  [k: string]: unknown;
}

interface UserProfessional {
  professional_type?: ProfessionalType;
  rest_id: string;
  [k: string]: unknown;
}

interface User {
  name: string;
  screen_name: string;
  id_str: string;
  favourites_count: number;
  profile_banner_url: string;
  location: string;
  notifications: boolean;
  possibly_sensitive: boolean;
  entities: UserEntities;
  profile_description_language: string;
  profile_image_shape: string;
  profile_interstitial_type: string;
  is_translator: boolean;
  translator_type: string;
  followers_count: number;
  friends_count: number;
  media_count: number;
  statuses_count: number;
  url: string;
  is_blue_verified: boolean;
  super_follow_eligible: boolean;
  super_followed_by: boolean;
  super_following: boolean;
  verified: boolean;
  verified_type?: VerifiedType;
  protected: boolean;
  profile_image_url_https: string;
  can_media_tag: boolean;
  follow_request_sent: boolean;
  description: string;
  blocked_by: boolean;
  blocking: boolean;
  followed_by: boolean;
  following: boolean;
  live_following: boolean;
  muting: boolean;
  has_graduated_access: boolean;
  created_at: string;
  parody_commentary_fan_label: string;
  professional?: UserProfessional;
  [k: string]: unknown;
}

interface Views {
  count: number;
  state: string;
  [k: string]: unknown;
}

interface Media {
  allow_download_status: boolean;
  display_url: string;
  expanded_url: string;
  ext_media_availability: {
    status: 'Available'; // TODO:
  };
  features: {
    [k: string]: unknown;
  };
  id_str: string;
  indices: number[];
  media_key: string;
  media_results: object;
  media_url_https: string;
  original_info: {
    height: number;
    width: number;
  };
  sizes: object;
  type: 'photo' | 'video' | 'gif'; // TODO: make sure this is right
  url: string;
}

interface Entities {
  media?: Media[];
  [k: string]: unknown;
}

interface QuotedStatusPermalink {
  display: string;
  expanded: string;
  url: string;
  [k: string]: unknown;
}

export interface Tweet {
  bookmark_count: number;
  bookmarked: boolean;
  conversation_id_str: string;
  display_text_range: number[];
  entities: Entities;
  extended_entities?: Entities; // TODO: idk if this is right
  favorite_count: number;
  favorited: boolean;
  full_text: string;
  id_str: string;
  is_quote_status: boolean;
  lang: string;
  quote_count: number;
  quoted_status_permalink: QuotedStatusPermalink;
  reply_count: number;
  retweet_count: number;
  retweeted: boolean;
  edit_control: EditControl;
  is_translatable: boolean;
  has_super_follower: boolean;
  grok_analysis_button: boolean;
  cashtag_attachments: unknown[];
  grok_annotations: GrokAnnotations;
  user: User;
  quoted_status: Tweet | null;
  views: Views;
  text: string;
  created_at: string;
  permalink: string;
  [k: string]: unknown;
}
