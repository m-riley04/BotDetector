import * as dates from '../src/common/dates';
import * as helpers from '../src/common/helpers';
import * as parsing from '../src/common/parsing';
import * as serialization from '../src/react/serialization';

const silence = (method) =>
  jest.spyOn(console, method).mockImplementation(() => {});

afterEach(() => jest.restoreAllMocks());

test('getLastDayOfMonth handles month lengths and leap years', () => {
  const last = (y, m) => dates.getLastDayOfMonth(new Date(y, m, 15));
  expect(last(2025, 0)).toBe(31);
  expect(last(2025, 3)).toBe(30);
  expect(last(2025, 1)).toBe(28);
  expect(last(2024, 1)).toBe(29);
  expect(last(1900, 1)).toBe(28);
  expect(last(2000, 1)).toBe(29);
  expect(last(2025, 11)).toBe(31);
});

test('isFirstOrLastDayOfMonth matches only the boundaries', () => {
  const is = (y, m, d) => dates.isFirstOrLastDayOfMonth(new Date(y, m, d));
  expect(is(2025, 5, 1)).toBe(true);
  expect(is(2025, 5, 30)).toBe(true);
  expect(is(2025, 5, 2)).toBe(false);
  expect(is(2025, 5, 29)).toBe(false);
  expect(is(2024, 1, 29)).toBe(true);
  expect(is(2024, 1, 28)).toBe(false);
  expect(is(2025, 1, 28)).toBe(true);
});

test('isRecord accepts only plain objects', () => {
  expect(helpers.isRecord({})).toBe(true);
  expect(helpers.isRecord({ a: 1 })).toBe(true);
  for (const value of [null, undefined, [], [1], 'str', 1, true, () => {}]) {
    expect(helpers.isRecord(value)).toBe(false);
  }
});

test('parseReactPropsResponse rejects invalid input', () => {
  const error = silence('error');
  for (const value of [
    null,
    'x',
    [],
    {},
    { id: 1, props: {} },
    { id: 'a' },
    { id: 'a', props: [] },
    { id: 'a', props: null },
  ]) {
    expect(parsing.parseReactPropsResponse(value)).toBe(undefined);
  }
  expect(error).toHaveBeenCalledTimes(8);
});

test('parseReactPropsResponse handles missing and invalid components', () => {
  const error = silence('error');
  expect(parsing.parseReactPropsResponse({ id: 'a', props: {} })).toStrictEqual(
    {
      id: 'a',
      props: {},
    }
  );
  expect(error).toHaveBeenCalledTimes(0);

  expect(
    parsing.parseReactPropsResponse({ id: 'a', props: { components: {} } })
  ).toBe(undefined);
  expect(error).toHaveBeenCalledTimes(1);
});

test('parseReactPropsResponse keeps valid components and skips malformed ones', () => {
  const warn = silence('warn');
  const result = parsing.parseReactPropsResponse({
    id: 'a',
    props: {
      components: [
        { name: 'b', props: { x: 1 } },
        { name: 'only-name' },
        { props: { y: 2 } },
        {},
        { name: 5 },
        { name: 'bad', props: [] },
        null,
        'str',
      ],
    },
  });

  expect(result).toStrictEqual({
    id: 'a',
    props: {
      components: [
        { name: 'b', props: { x: 1 } },
        { name: 'only-name' },
        { props: { y: 2 } },
        {},
      ],
    },
  });
  expect(warn).toHaveBeenCalledTimes(4);
});

const freshState = () => ({ nodes: 0, seen: new WeakSet() });

test('toSerializable passes primitives through and drops unsupported values', () => {
  const to = (value) => serialization.toSerializable(value, freshState(), 0);
  expect(to(null)).toBe(null);
  expect(to(true)).toBe(true);
  expect(to(42)).toBe(42);
  expect(to('hi')).toBe('hi');
  expect(to(undefined)).toBe(undefined);
  expect(to(() => 1)).toBe(undefined);
  expect(to(Symbol('s'))).toBe(undefined);
  expect(to('a'.repeat(500)).length).toBe(300);
});

test('toSerializable serializes nested objects and arrays', () => {
  const result = serialization.toSerializable(
    { a: 1, b: [1, undefined, () => 1, 'x'], c: { d: null, e: undefined } },
    freshState(),
    0
  );
  expect(result).toStrictEqual({ a: 1, b: [1, 'x'], c: { d: null } });
});

test('toSerializable skips React internals and truncates large collections', () => {
  const skipped = serialization.toSerializable(
    { _owner: 1, ref: 1, return: 1, child: 1, sibling: 1, keep: 1 },
    freshState(),
    0
  );
  expect(skipped).toStrictEqual({ keep: 1 });

  const array = serialization.toSerializable(
    Array.from({ length: 50 }, (_, i) => i),
    freshState(),
    0
  );
  expect(array.length).toBe(20);

  const object = serialization.toSerializable(
    Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`k${i}`, i])),
    freshState(),
    0
  );
  expect(Object.keys(object).length).toBe(40);
});

test('toSerializable marks circular references but allows shared siblings', () => {
  const circular = { name: 'loop' };
  circular.self = circular;
  expect(serialization.toSerializable(circular, freshState(), 0)).toStrictEqual(
    {
      name: 'loop',
      self: '[Circular]',
    }
  );

  const shared = { v: 1 };
  expect(
    serialization.toSerializable({ a: shared, b: shared }, freshState(), 0)
  ).toStrictEqual({ a: { v: 1 }, b: { v: 1 } });
});

test('toSerializable respects depth and node limits', () => {
  const options = { maxNodes: 250, maxDepth: 2 };
  const deep = { l1: { l2: { l3: { l4: 1 } } } };
  expect(
    serialization.toSerializable(deep, freshState(), 0, options)
  ).toStrictEqual({ l1: { l2: {} } });

  const limited = serialization.toSerializable(
    { a: { x: 1 }, b: { x: 1 }, c: { x: 1 } },
    freshState(),
    0,
    { maxNodes: 2, maxDepth: 5 }
  );
  expect(Object.keys(limited).length < 3).toBeTruthy();
});

test('getReactData reads props and fiber components, with "b" first', () => {
  const element = {
    __reactProps$abc: { tweet: { id: '1' } },
    __reactFiber$abc: {
      type: 'div',
      memoizedProps: { a: 1 },
      return: {
        type: function b() {},
        memoizedProps: { z: 2 },
        return: {
          type: Object.assign(function Other() {}, { displayName: 'Shown' }),
          memoizedProps: { q: 3 },
          return: { type: 'span', memoizedProps: 'not-a-record' },
        },
      },
    },
  };

  const data = serialization.getReactData(element);
  expect(data.elementProps).toStrictEqual({ tweet: { id: '1' } });
  expect(data.components).toStrictEqual([
    { name: 'b', props: { z: 2 } },
    { name: 'div', props: { a: 1 } },
    { name: 'Shown', props: { q: 3 } },
  ]);
});

test('getReactData returns an empty result without React keys', () => {
  expect(serialization.getReactData({ other: 1 })).toStrictEqual({});
});

test('getReactData stops walking the fiber chain at maxDepth', () => {
  let fiber;
  for (let i = 0; i < 10; i++) {
    fiber = { type: 'div', memoizedProps: { i }, return: fiber };
  }
  const data = serialization.getReactData(
    { __reactFiber$x: fiber },
    { propsKey: '__reactProps$', fiberKeys: ['__reactFiber$'], maxDepth: 3 }
  );
  expect(data.components.length).toBe(3);
});
