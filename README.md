# Firefox TypeScript Extension

A minimal Firefox WebExtension starter with a TypeScript popup and background
script. The popup demonstrates accessing the active tab after a user click.

## Requirements

- Node.js 20 or newer
- Firefox 128 or newer

## Build

```sh
pnpm install
pnpm run typecheck
pnpm run build
```

The loadable extension is generated in `dist/`.

## Try it in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on...**.
3. Select `dist/manifest.json`.
4. Open a regular webpage, select the extension button, and click **Read current page title**.

Temporary add-ons are removed when Firefox closes.

## Customize

- Edit `src/popup.ts` for popup behavior.
- Edit `src/background.ts` for extension lifecycle and background behavior.
- Edit `popup.html` and `popup.css` for the popup interface.
- Update `manifest.json` when changing permissions or extension metadata.
- Replace `firefox-typescript-template@example.com` in `manifest.json` with an
  identifier you control before publishing.
