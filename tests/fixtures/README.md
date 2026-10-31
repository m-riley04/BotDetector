# Fixtures

This directory is for the test fixtures (a mix of real and mock raw json post objects to test from various sources).

This holds raw post objects (the same JSON the **Copy post JSON** button produces). The tests validate and convert each capture through the designated adapter before scoring it, so fixtures exercise the same normalized `Post` model as the extension.

## Naming

For the folder, you should name it to whichever adapter you want to use.

<!-- TODO: this needs to be more deterministic/identifiable. It's pretty hard-coded to twitter rn. -->

For the filename, if you believe that the post/user JSON you are pasting is:

- A bot: `bot-*.json`
- A human: `human-*.json`

## Custom Fixture Parameters

A bot fixture can instead list `"_expect_checks": ["onlyfans-model", ...]` (ids that must trigger) and `"_expanded_links": {"https://t.co/...": "https://destination"}` (what the shortened link resolves to).

## Fixture Clock

The fixture clock is currently pinned to 2026-10-18.
