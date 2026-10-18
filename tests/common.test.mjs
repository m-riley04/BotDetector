import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { afterEach, mock, test } from 'node:test';

async function load(entry) {
  const { outputFiles } = await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
  );
}

const dates = await load('src/common/dates.ts');
const helpers = await load('src/common/helpers.ts');
const parsing = await load('src/common/parsing.ts');
const serialization = await load('src/react/serialization.ts');

afterEach(() => mock.restoreAll());

test('getLastDayOfMonth handles month lengths and leap years', () => {
  const last = (y, m) => dates.getLastDayOfMonth(new Date(y, m, 15));
  assert.equal(last(2025, 0), 31);
  assert.equal(last(2025, 3), 30);
  assert.equal(last(2025, 1), 28);
  assert.equal(last(2024, 1), 29);
  assert.equal(last(1900, 1), 28);
  assert.equal(last(2000, 1), 29);
  assert.equal(last(2025, 11), 31);
});

test('isFirstOrLastDayOfMonth matches only the boundaries', () => {
  const is = (y, m, d) => dates.isFirstOrLastDayOfMonth(new Date(y, m, d));
  assert.equal(is(2025, 5, 1), true);
  assert.equal(is(2025, 5, 30), true);
  assert.equal(is(2025, 5, 2), false);
  assert.equal(is(2025, 5, 29), false);
  assert.equal(is(2024, 1, 29), true);
  assert.equal(is(2024, 1, 28), false);
  assert.equal(is(2025, 1, 28), true);
});

test('isRecord accepts only plain objects', () => {
  assert.equal(helpers.isRecord({}), true);
  assert.equal(helpers.isRecord({ a: 1 }), true);
  for (const value of [null, undefined, [], [1], 'str', 1, true, () => {}]) {
    assert.equal(helpers.isRecord(value), false, String(value));
  }
});

test('parseReactPropsResponse rejects invalid input', () => {
  const error = mock.method(console, 'error', () => {});
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
    assert.equal(parsing.parseReactPropsResponse(value), undefined);
  }
  assert.equal(error.mock.callCount(), 8);
});

test('parseReactPropsResponse handles missing and invalid components', () => {
  const error = mock.method(console, 'error', () => {});
  assert.deepEqual(parsing.parseReactPropsResponse({ id: 'a', props: {} }), {
    id: 'a',
    props: {},
  });
  assert.equal(error.mock.callCount(), 0);

  assert.equal(
    parsing.parseReactPropsResponse({ id: 'a', props: { components: {} } }),
    undefined
  );
  assert.equal(error.mock.callCount(), 1);
});

test('parseReactPropsResponse keeps valid components and skips malformed ones', () => {
  const warn = mock.method(console, 'warn', () => {});
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

  assert.deepEqual(result, {
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
  assert.equal(warn.mock.callCount(), 4);
});

const freshState = () => ({ nodes: 0, seen: new WeakSet() });

test('toSerializable passes primitives through and drops unsupported values', () => {
  const to = (value) => serialization.toSerializable(value, freshState(), 0);
  assert.equal(to(null), null);
  assert.equal(to(true), true);
  assert.equal(to(42), 42);
  assert.equal(to('hi'), 'hi');
  assert.equal(to(undefined), undefined);
  assert.equal(
    to(() => 1),
    undefined
  );
  assert.equal(to(Symbol('s')), undefined);
  assert.equal(to('a'.repeat(500)).length, 300);
});

test('toSerializable serializes nested objects and arrays', () => {
  const result = serialization.toSerializable(
    { a: 1, b: [1, undefined, () => 1, 'x'], c: { d: null, e: undefined } },
    freshState(),
    0
  );
  assert.deepEqual(result, { a: 1, b: [1, 'x'], c: { d: null } });
});

test('toSerializable skips React internals and truncates large collections', () => {
  const skipped = serialization.toSerializable(
    { _owner: 1, ref: 1, return: 1, child: 1, sibling: 1, keep: 1 },
    freshState(),
    0
  );
  assert.deepEqual(skipped, { keep: 1 });

  const array = serialization.toSerializable(
    Array.from({ length: 50 }, (_, i) => i),
    freshState(),
    0
  );
  assert.equal(array.length, 20);

  const object = serialization.toSerializable(
    Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`k${i}`, i])),
    freshState(),
    0
  );
  assert.equal(Object.keys(object).length, 40);
});

test('toSerializable marks circular references but allows shared siblings', () => {
  const circular = { name: 'loop' };
  circular.self = circular;
  assert.deepEqual(serialization.toSerializable(circular, freshState(), 0), {
    name: 'loop',
    self: '[Circular]',
  });

  const shared = { v: 1 };
  assert.deepEqual(
    serialization.toSerializable({ a: shared, b: shared }, freshState(), 0),
    { a: { v: 1 }, b: { v: 1 } }
  );
});

test('toSerializable respects depth and node limits', () => {
  const options = { maxNodes: 250, maxDepth: 2 };
  const deep = { l1: { l2: { l3: { l4: 1 } } } };
  assert.deepEqual(
    serialization.toSerializable(deep, freshState(), 0, options),
    { l1: { l2: {} } }
  );

  const limited = serialization.toSerializable(
    { a: { x: 1 }, b: { x: 1 }, c: { x: 1 } },
    freshState(),
    0,
    { maxNodes: 2, maxDepth: 5 }
  );
  assert.ok(Object.keys(limited).length < 3);
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
  assert.deepEqual(data.elementProps, { tweet: { id: '1' } });
  assert.deepEqual(data.components, [
    { name: 'b', props: { z: 2 } },
    { name: 'div', props: { a: 1 } },
    { name: 'Shown', props: { q: 3 } },
  ]);
});

test('getReactData returns an empty result without React keys', () => {
  assert.deepEqual(serialization.getReactData({ other: 1 }), {});
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
  assert.equal(data.components.length, 3);
});
