# BotDetector

## Requirements

- Node.js 20 or newer
- Firefox 128 or newer

## Build

```sh
pnpm install
pnpm build
```

The loadable extension is generated in `dist/`.

## Test

Run the automated tests with:

```sh
pnpm test
```

## Try it in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on...**.
3. Select `dist/manifest.json`.
4. Open a regular webpage, select the extension button, and click **Read current page title**.

Temporary add-ons are removed when Firefox closes.

## Bot Detection Weights

Potential signifiers of a twitter bot (or bot interference)

- Account
  - Username
    - \>4 numbers at the end
    - CamelCasing
    - Random non-name words
    - Random characters
  - Bio
    - Excessive emoji usage
    - No bio whatsoever
  - Blue checkmark
  - Non-business accounts
  - No profile picture
  - Inhumane amount of posts
  - Very small difference between followers and following
- Content
  - Overly generic comments
  - Use of l33tspeak to get around filters
  - Strange links/promos
  - Slurs
  - Excessive political content
  - Quote tweets other blue-check accounts
- Identical tweets or semi-identical tweets to others in the same thread
