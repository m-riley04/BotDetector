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

Tests are TypeScript and run with Jest. `pnpm typecheck` type-checks the source and the tests.

`tests/fixtures/` holds raw tweet objects (the same JSON the **Copy tweet JSON** button produces). Files named `bot-*.json` must be flagged and `human-*.json` must not, using the default weights. A bot fixture can instead list `"_expect_checks": ["onlyfans-model", ...]` (ids that must trigger) and `"_expanded_links": {"https://t.co/...": "https://destination"}` (what the t.co link resolves to). The fixture clock is pinned to 2026-10-18. The bundled ones are synthetic; drop in real captures to grow the regression corpus.

## Features

- **t.co expansion:** profile links are shortened, so the background script fetches each `t.co` page (no cookies, no redirects followed, the destination is never contacted) and reads the destination, so adult/link-in-bio sites (OnlyFans, Fansly, bouncy.ai, beacons.ai, dm.bio...) are recognised. This needs the `https://t.co/*` host permission; if expansion seems to do nothing, grant it under `about:addons` → the extension → Permissions.
- **Username history:** if the tweet carries X's "About this account" data (`user.about_profile.username_changes`), a change within the last year or 3+ changes is flagged (a sign of a sold or hacked account). The extension doesn't fetch it itself because X's private query needs rotating IDs.
- Per-check toggles and weight sliders in the popup (weights are additive evidence and don't need to sum to 1; negative weights are trust signals that lower the score).
- Allowlist/blocklist, editable in the popup or from a post's details dialog (**Mark as human**, **Always hide**).
- **Show hidden posts** reveals posts hidden by "Hide likely bots", and the popup shows counts for the current page.
- Settings can be copied out and pasted back in under **Backup**.
- Reports are cached per author and post; pressing `r` on the page rescans.

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
