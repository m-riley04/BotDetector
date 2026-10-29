import { loadDecancer } from '../src/social-media/decancer';

// Detection/normalization assume decancer is loaded (content.ts awaits it at startup), so do the same here.
beforeAll(() => loadDecancer());
