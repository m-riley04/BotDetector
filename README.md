# BotDetector

## Table of Contents

- [Overview](#overview)
- [Features](#features)
  - [Detection Methods](#detection-methods)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
- [Development and Contributing](#development-and-contributing)
- [Social Media-Agnositc Approach](#social-media-agnostic-approach)
- [AI Policy](#ai-policy)
  - [In-App](#in-app)
  - [Development](#development)

## Overview

BotDetector is a web extension to help users detect and flag posts that are most likely to be artificial.

## Features

- Per-post and per-user bot probability algorithm via a "checks and weights" system
  - Checks are examinations of specific elements of a post/user. They are either true or false.
  - Every check has an associated weight assigned to it. A positive weight indicates a better chance of being a bot. A negative weight indicates less of a chance to be a bot (aka a better chance to be a human/real).
- Per-post probability badges
- Extensive customization
  - Customizable bot detection threshold
    - The default detection threshold is at 75%, but you can always raise or lower that to your liking!
  - Per-check toggles and weight sliders in the popup
    - If you don't agree with my checks/weights, just change them!
    - In the future, I will be expanding this system to allow users to add their own checks via RegEx and other factors.
  - Allowlist/blocklist
    - Editable in the popup or from a post's details dialog ("Mark as human", "Always hide").
  - Show hidden posts
    - Reveals posts hidden by "Hide likely bots", and the popup shows counts for the current page.
- Export/import settings data

### Detection Methods

In general, I believe in being safe than sorry. I'd rather assume the whole internet is bots than believe the amount of hate there is truly representative of reality.

Because of that belief, I believe some false-positves are worth it to help the mental health of users.

- Fancy text detection
  - A lot of bots/trolls use lookalike text to confuse users
  - Some users might also use unicode fonts for pazazz (i.e. "𝖈𝖑𝖎𝖈𝖐 𝖍𝖊𝖗𝖊")
- Shortend link expansion
  - Links on many social media sites are shortened and/or go through a proxy. This makes it difficult for detection algorithms to find suspicious links.
  - The background script _safely_ fetches each shortened page (no cookies, no redirects followed, the destination is never contacted) and reads the destination, so adult/link-in-bio sites (OnlyFans, Fansly, bouncy.ai, beacons.ai, dm.bio...) are recognised.
  - Requires host permissions for each link-shortener domain (i.e. `https://t.co/*`). If expansion seems to do nothing, grant it under `about:addons` -> BotDetector -> Permissions.
- Username history
  - If the user visits the "About this user" page, a change within the last year or 3+ changes is flagged (a sign of a sold or hacked account)
  - For Twitter, he extension doesn't currently fetch it itself because Twitter's private query needs rotating IDs. API support is being considered.

### Keyboard Shortcuts

- `r`: manually re-scan reports

## Building, Developing, and Contributing

To learn how to develop, build locally, and contribute to BotDetector, look at the [contributing docs](CONTRIBUTING.md).

## Social Media-Agnostic Approach

Internally, this extension uses an adapter pattern approach to allow multiple different social media sites to be able to be detected.

Currently, we are focusing on Twitter (one of the main culprits for bot activity), but the system can allow for a wide variety of sites.

This system will be expanded in future versions.

## AI Policy

### In-App

Let me be clear: this does NOT utilize a generative AI model (i.e. ChatGPT, Claude, etc.) for it's detections.

This is NOT a ChatGPT wrapper!

Perhaps in the future, I could implement some _machine learning_ algorithm (_NOT_ an LLM) to detect post intent, but that's for the future.

### Development

Don't worry. I'm trying to do this project "by hand" as much as possible. If an algorithm is slow, I'll get to it.

With that being said, I'll tell you what I absolutely do _**not**_ like in terms of AI:

- Videos
- Audio
- Images
- Graphic Design
- Music
- Public-facing Text

When those things appear in my projects, you can be certain they were made by a human (probably me).

As for my beliefs on AI usage _in programming_, the jury is still out on that one. I have differing opinions based on the situation and usage, but it's too much to discuss in a README. I plan to make a write-up on it eventually on [my website](https://rileymeyerkorth.com). I'll update this with it when I get to it.

I am not going to pretend I am some coding genius (yet...?). The people making the Linux kernel are though, so [I'll agree with them for now](https://docs.kernel.org/process/coding-assistants.html).
