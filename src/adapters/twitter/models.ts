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

interface UserUrlEntity {
  urls: unknown[];
  [k: string]: unknown;
}

interface UserEntities {
  description: UserDescriptionEntity;
  url?: UserUrlEntity;
  [k: string]: unknown;
}

interface UserProfessional {
  professional_type?: ProfessionalType;
  rest_id: string;
  [k: string]: unknown;
}

interface UserVerificationInfoReasonDescription {
  text: string;
  [k: string]: unknown;
}

interface UserVerificationInfoReason {
  description: UserVerificationInfoReasonDescription;
  verified_since_msec: string;
  [k: string]: unknown;
}

interface UserVerificationInfo {
  is_identity_verified: boolean;
  reason: UserVerificationInfoReason;
  [k: string]: unknown;
}

interface UserBusinessAccount {
  affiliates_count?: number;
  [k: string]: unknown;
}

interface UserHighlightsInfo {
  can_highlight_tweets: boolean;
  highlighted_tweets: string;
  [k: string]: unknown;
}

interface User {
  blocked_by: boolean;
  blocking?: boolean;
  business_account?: UserBusinessAccount;
  can_media_tag: boolean;
  created_at: string;
  creator_subscriptions_count?: number;
  description: string;
  entities: UserEntities;
  favourites_count: number;
  follow_request_sent: boolean;
  followed_by: boolean;
  followers_count: number;
  following: boolean;
  friends_count: number;
  has_graduated_access?: boolean;
  has_hidden_subscriptions_on_profile?: boolean;
  highlights_info?: UserHighlightsInfo;
  id_str: string;
  is_blue_verified: boolean;
  is_translator: boolean;
  live_following: boolean;
  location: string;
  media_count: number;
  muting: boolean;
  name: string;
  notifications: boolean;
  parody_commentary_fan_label?: string;
  pinned_tweet_ids?: string[];
  possibly_sensitive: boolean;
  professional?: UserProfessional;
  profile_banner_url: string;
  profile_description_language: string;
  profile_image_shape: 'Circle' | 'Square' | string;
  profile_image_url_https: string;
  profile_interstitial_type: string;
  profile_sort_enabled?: boolean;
  protected: boolean;
  screen_name: string;
  statuses_count: number;
  super_follow_eligible: boolean;
  super_followed_by: boolean;
  super_following: boolean;
  translator_type: 'none' | string;
  url: string;
  user_seed_tweet_count?: number;
  verification_info?: UserVerificationInfo;
  verified_type?: VerifiedType;
  verified: boolean;
  [k: string]: unknown;
}

interface Views {
  count: number;
  state: string;
  [k: string]: unknown;
}

interface MediaInfo {
  height: number;
  width: number;
  [k: string]: unknown;
}

interface MediaFeatures {
  [k: string]: unknown;
}

interface MediaAvailability {
  status: 'Available'; // TODO:
  [k: string]: unknown;
}

interface Media {
  allow_download_status: boolean;
  display_url: string;
  expanded_url: string;
  ext_media_availability: MediaAvailability;
  features: MediaFeatures;
  id_str: string;
  indices: number[];
  media_key: string;
  media_results: object;
  media_url_https: string;
  original_info: MediaInfo;
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

interface QuickPromoteEligibility {
  eligible: 'IneligibleNotVerified' | string;
  [k: string]: unknown;
}

export interface Tweet {
  bookmark_count: number;
  bookmarked: boolean;
  cashtag_attachments: unknown[];
  conversation_id_str: string;
  created_at: string;
  display_text_range: number[];
  edit_control: EditControl;
  entities: Entities;
  extended_entities?: Entities; // TODO: idk if this is right
  favorite_count: number;
  favorited: boolean;
  full_text: string;
  grok_analysis_button: boolean;
  grok_annotations: GrokAnnotations;
  has_super_follower: boolean;
  id_str: string;
  in_reply_to_screen_name?: string;
  in_reply_to_status_id_str?: string;
  in_reply_to_user?: User;
  in_reply_to_user_id_str?: string;
  is_quote_status: boolean;
  is_translatable: boolean;
  lang: string;
  permalink: string;
  possibly_sensitive?: boolean;
  possibly_sensitive_editable?: boolean;
  quick_promote_eligibility?: QuickPromoteEligibility;
  quote_count: number;
  quoted_status_permalink: QuotedStatusPermalink;
  quoted_status?: Tweet;
  reply_count: number;
  retweet_count: number;
  retweeted: boolean;
  text: string;
  user: User;
  views: Views;
  [k: string]: unknown;
}
