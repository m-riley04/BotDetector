import {
  expandTcoUrls,
  isExpandLinksRequest,
  isTcoUrl,
  parseTcoPage,
} from '../src/common/links';
import { LinkExpander } from '../src/detection/linkExpander';

const REAL_PAGE =
  '<head><noscript><META http-equiv="refresh" content="0;URL=http://bouncy.ai/nyankatsumi"></noscript>' +
  '<title>http://bouncy.ai/nyankatsumi</title></head>' +
  '<script>window.opener = null; location.replace("http:\\/\\/bouncy.ai\\/nyankatsumi")</script>';

describe('isTcoUrl', () => {
  test.each(['https://t.co/CgmxoyLGiJ', 'https://t.co/abc123'])(
    'accepts %s',
    (url) => {
      expect(isTcoUrl(url)).toBe(true);
    }
  );

  test.each([
    'http://t.co/CgmxoyLGiJ',
    'https://t.co/',
    'https://t.co.evil.com/abcdef',
    'https://example.com/abcdef',
    undefined,
    42,
  ])('rejects %s', (url) => {
    expect(isTcoUrl(url)).toBe(false);
  });
});

describe('parseTcoPage', () => {
  test('reads the destination from the real t.co page', () => {
    expect(parseTcoPage(REAL_PAGE)).toBe('http://bouncy.ai/nyankatsumi');
  });

  test('falls back to the script, then the title', () => {
    expect(
      parseTcoPage(
        '<script>location.replace("https:\\/\\/dm.bio\\/x")</script>'
      )
    ).toBe('https://dm.bio/x');
    expect(parseTcoPage('<title>https://beacons.ai/x</title>')).toBe(
      'https://beacons.ai/x'
    );
  });

  test('ignores non-web and t.co destinations', () => {
    expect(parseTcoPage('<title>javascript:alert(1)</title>')).toBeUndefined();
    expect(parseTcoPage('<title>https://t.co/abcdef</title>')).toBeUndefined();
    expect(parseTcoPage('nothing here')).toBeUndefined();
  });
});

describe('expandTcoUrls', () => {
  test('fetches without cookies or redirects and skips junk', async () => {
    const fetchFn = jest.fn(async (url: string, _init?: unknown) => ({
      ok: url.endsWith('GoodLink1'),
      text: async () => REAL_PAGE,
    }));

    const result = await expandTcoUrls(
      [
        'https://t.co/GoodLink1',
        'https://t.co/GoodLink1',
        'https://t.co/BadLink22',
        'https://example.com/x',
      ],
      fetchFn
    );

    expect(result).toEqual({
      'https://t.co/GoodLink1': 'http://bouncy.ai/nyankatsumi',
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[0][1]).toMatchObject({
      redirect: 'manual',
      credentials: 'omit',
    });
  });

  test('a failing fetch just yields no destination', async () => {
    const result = await expandTcoUrls(['https://t.co/GoodLink1'], async () => {
      throw new Error('offline');
    });
    expect(result).toEqual({});
  });
});

test('isExpandLinksRequest checks the message shape', () => {
  expect(isExpandLinksRequest({ type: 'expand-links', urls: [] })).toBe(true);
  expect(isExpandLinksRequest({ type: 'other', urls: [] })).toBe(false);
  expect(isExpandLinksRequest(null)).toBe(false);
});

describe('LinkExpander', () => {
  test('requests each link once and remembers answers', async () => {
    const send = jest.fn(async () => ({
      'https://t.co/GoodLink1': 'https://onlyfans.com/x',
    }));
    const expander = new LinkExpander(send);

    expect(await expander.expand(['https://t.co/GoodLink1', 'nope'])).toBe(
      true
    );
    expect(expander.links).toEqual({
      'https://t.co/GoodLink1': 'https://onlyfans.com/x',
    });
    expect(expander.needs('https://t.co/GoodLink1')).toBe(false);

    expect(await expander.expand(['https://t.co/GoodLink1'])).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('unresolved links are not retried and failures are tolerated', async () => {
    const send = jest.fn(async () => {
      throw new Error('no background');
    });
    const expander = new LinkExpander(send);

    expect(await expander.expand(['https://t.co/GoodLink1'])).toBe(false);
    expect(expander.needs('https://t.co/GoodLink1')).toBe(false);
  });
});
