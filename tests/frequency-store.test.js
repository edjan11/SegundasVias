const assert = require('assert');
const { InMemoryFrequencyStore } = require('../dist-src/server/frequencyStore.js');

(async () => {
  console.log('Running frequency store tests...');

  // Mock time control
  let now = 1000;
  const nowFn = () => now;

  const store = new InMemoryFrequencyStore({ ttlMs: 1000, maxEntries: 3, now: nowFn });

  // increment and get
  const keyA = 'u1::CityA::SE';
  const keyB = 'u1::CityB::AL';
  (async () => {
    const v1 = await store.increment(keyA);
    assert.strictEqual(v1, 1);
    const v2 = await store.increment(keyA);
    assert.strictEqual(v2, 2);
    const g = await store.get(keyA);
    assert.strictEqual(g, 2);

    // TTL: simulate time pass
    now += 2000;
    await store.prune();
    const g2 = await store.get(keyA);
    assert.strictEqual(g2, 0, 'Entry should have expired by TTL');

    // LRU / limit: fill entries
    now = 0;
    await store.increment('s::A::X');
    await store.increment('s::B::X');
    await store.increment('s::C::X');
    // access B to make it recent
    await store.get('s::B::X');
    // add D triggers eviction (maxEntries=3)
    await store.increment('s::D::X');
    const entries = Array.from(store.map.keys());
    // expect B, C, D present (A evicted or oldest)
    assert(entries.includes('s::B::X'));
    assert(entries.includes('s::C::X'));
    assert(entries.includes('s::D::X'));

    // reset scope
    await store.reset('s');
    const afterReset = Array.from(store.map.keys()).filter((k) => k.startsWith('s::'));
    assert(afterReset.length === 0);

    console.log('Frequency store tests passed.');
  })();
})();