# Contributing to BotDetector

I need to flesh this out more.

Basically, just write good code if you can please.

## Requirements

- Node.js 20 or newer
- Firefox 142 or newer
- pnpm 12.6.0 or newer

## Build

```sh
pnpm i
pnpm build
```

The loadable extension is generated in `dist/`.

## Testing

Run the automated tests with:

```sh
pnpm test
```

Tests are TypeScript and run with Jest.

### Test Fixtures

See the [fixtures README](./tests/fixtures/README.md).

## Code Quality

Here is some documentation I recommend and personally try to follow for writing good code.

- Writing good functions
  - [this video](https://www.youtube.com/watch?v=2OMRWPOSw9s) by Logan Smith.

## AI Guidelines

I really don't know right now. Like I said in the README, things are changing very quickly.

I think the [Linux kernel engineers](https://docs.kernel.org/process/coding-assistants.html) are a good starting point, as well as Linus Torvold's views on it.

Really though, here is the bottom line: _**you need to own the code that you push**_. You can't just push bad code and then hide behind the fact that "it's AI-generated, it wasn't MY mistake". This, inherently, means you need to review EVERYTHING.
