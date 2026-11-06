import { TwitterScanner } from './adapters/twitter/scanner';
import { isContentRequest } from './common/messages';
import { SocialMediaScanner } from './common/scanner';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  sanitizeSettings,
  SETTINGS_KEY,
  type Settings,
} from './common/settings';
import { LOG_PREFIX } from './constants';

// User settings from the popup; kept in sync via storage change events
let settings: Settings = DEFAULT_SETTINGS;
let scanner: SocialMediaScanner;

// pick a scanner
// TODO: make this system better or a better pattern
if (/.*reddit.com.*/.test(window.location.hostname)) {
  console.log(`${LOG_PREFIX} Using Reddit scanner`);
  scanner = new TwitterScanner(settings); // TODO: add reddit scanner
} else {
  console.log(`${LOG_PREFIX} Using Twitter scanner`);
  scanner = new TwitterScanner(settings);
}

scanner.initializeListeners();

// answers requests from the popup and the background script
browser.runtime.onMessage.addListener((message: unknown) => {
  console.log('browser runtime message');
  if (!isContentRequest(message)) return undefined;
  if (message.type === 'show-hidden') scanner.revealHiddenTweets();
  if (message.type === 'rescan') scanner.rescan();
  return Promise.resolve(scanner.getStats());
});

// re-apply the badges whenever the popup changes a setting
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !(SETTINGS_KEY in changes)) return;

  scanner.setSettings(sanitizeSettings(changes[SETTINGS_KEY].newValue));
  //scanner.clearCache();
  scanner.clear();
  scanner.scan();
});

// load settings, then the react bridge, and start scanning tweets once it's all ready
void loadSettings()
  .then((loaded) => {
    settings = loaded;
  })
  .catch((error) => {
    // keep going with DEFAULT_SETTINGS rather than disabling detection
    console.error(`${LOG_PREFIX} Could not load settings.`, error);
  })
  .then(() => {
    document.addEventListener('scrollend', scanner.scan);
  });

export {};
