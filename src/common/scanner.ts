export abstract class SocialMediaScanner {
  abstract readonly domains: string[];

  abstract scanPosts: () => void;
}
