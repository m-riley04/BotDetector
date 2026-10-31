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

`tests/fixtures/` holds raw tweet objects (the same JSON the **Copy tweet JSON** button produces). The tests validate and convert each capture through the Twitter adapter before scoring it, so fixtures exercise the same normalized `Post` model as the extension. Files named `bot-*.json` must be flagged and `human-*.json` must not, using the default weights. A bot fixture can instead list `"_expect_checks": ["onlyfans-model", ...]` (ids that must trigger) and `"_expanded_links": {"https://t.co/...": "https://destination"}` (what the t.co link resolves to). The fixture clock is pinned to 2026-10-18. The bundled ones are synthetic; drop in real captures to grow the regression corpus.

## Features

- **t.co expansion:** profile links are shortened, so the background script fetches each `t.co` page (no cookies, no redirects followed, the destination is never contacted) and reads the destination, so adult/link-in-bio sites (OnlyFans, Fansly, bouncy.ai, beacons.ai, dm.bio...) are recognised. This needs the `https://t.co/*` host permission; if expansion seems to do nothing, grant it under `about:addons` → the extension → Permissions.
- **Username history:** if the tweet carries X's "About this account" data (`user.about_profile.username_changes`), a change within the last year or 3+ changes is flagged (a sign of a sold or hacked account). The extension doesn't fetch it itself because X's private query needs rotating IDs.
- Per-check toggles and weight sliders in the popup (weights are additive evidence and don't need to sum to 1; negative weights are trust signals that lower the score).
- Allowlist/blocklist, editable in the popup or from a post's details dialog (**Mark as human**, **Always hide**).
- **Show hidden posts** reveals posts hidden by "Hide likely bots", and the popup shows counts for the current page.
- Settings can be copied out and pasted back in under **Backup**.
- Reports are cached per author and post; pressing `r` on the page rescans.

## Development

### Pnpm Scripts

- `build`: builds the extension
- `test`: runs all tests
- `start` and `firefox`: opens and installs the extension into Firefox
- `package`: builds and zips the extension
- `lint`: runs an eslint check
  - `lint:fix`: fixes eslint errors
  - `lint:ext`: checks the extension lint violations
- `format`: runs a Prettier check
  - `format:fix`: runs a Prettier write on all files

### Manually Try it in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on...**.
3. Select `dist/manifest.json`.
4. Open a supported social media site (i.e. Twitter) and scroll through posts

Temporary add-ons are removed when Firefox closes.

## AI Usage

Don't worry.

I'll tell you what I do absolutely _**not**_ like in terms of AI:

- Videos
- Audio
- Images
- Graphic Design
- Music
- Public-facing Text

If any of those things appear in my projects, you can be certain they were made by humans.

As for my beliefs on AI usage _in programming_, the jury is still out on that one. I have differing opinions based on the situation and usage, but it's too much to discuss in a READMD. I plan to make a write-up on it eventually on my website. I'll update this with it.

I'm trying to do this project by hand as much as possible. If an algorithm is slow, I'll get to it.

I am not going to pretend I am some coding genius (yet...?). The people making the Linux kernel are though, so [I'll agree with them for now](https://docs.kernel.org/process/coding-assistants.html).
