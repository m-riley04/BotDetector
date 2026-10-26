import { render } from 'preact';
import { DEFAULT_SETTINGS, loadSettings } from './common/settings';
import { ExtensionPopup } from './components/extension-popup/popup';

// the main entry point for the popup
// this follows extension development guidelines
const app = document.getElementById('app') as HTMLElement;
loadSettings()
  .catch((error) => {
    console.error('[BotDetector] Could not load settings.', error);
    return DEFAULT_SETTINGS;
  })
  .then((initial) => render(<ExtensionPopup initial={initial} />, app));
