export abstract class SocialMediaScanner {
  abstract readonly domains: string[];

  abstract scan: () => void;

  abstract rescan: () => void;

  abstract clear: () => void;
}
