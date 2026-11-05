import { TwitterScanner } from './adapters/twitter/scanner';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  type Settings,
} from './common/settings';
import { LOG_PREFIX } from './constants';

// User settings from the popup; kept in sync via storage change events
let settings: Settings = DEFAULT_SETTINGS;
const scanner = new TwitterScanner(settings); // TODO: add other scanners

scanner.initializeListeners();

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
