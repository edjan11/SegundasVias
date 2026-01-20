import express from 'express';
import bodyParser from 'body-parser';
import { InMemoryFrequencyStore } from './frequencyStore';

const app = express();
app.use(bodyParser.json());

// Singleton store for this server process
const store = new InMemoryFrequencyStore({ ttlMs: 30 * 24 * 60 * 60 * 1000, maxEntries: 50000 });

function makeKey(scopeId: string, city: string, uf: string) {
  return `${scopeId}::${city}::${uf}`;
}

// increment frequency: POST /api/frequency/increment { scopeId, city, uf }
app.post('/api/frequency/increment', async (req, res) => {
  try {
    const { scopeId, city, uf } = req.body || {};
    const scope = scopeId || (req.headers['x-session-id'] as string) || 'anon';
    if (!city || !uf) return res.status(400).json({ error: 'city and uf required' });
    const key = makeKey(scope, city, uf);
    const value = await store.increment(key, 1);
    res.json({ key, count: value });
  } catch (err) {
    console.error('frequency increment error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// reset frequency for scope: POST /api/frequency/reset { scopeId? }
app.post('/api/frequency/reset', async (req, res) => {
  try {
    const { scopeId } = req.body || {};
    await store.reset(scopeId);
    res.json({ ok: true });
  } catch (err) {
    console.error('frequency reset error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// snapshot: GET /api/frequency/snapshot?scopeId=...
app.get('/api/frequency/snapshot', async (req, res) => {
  try {
    const scopeId = (req.query.scopeId as string) || undefined;
    // build a small snapshot: top keys for scope
    const entries: Array<{ key: string; count: number }> = [];
    for (const [k, v] of (store as any).map.entries()) {
      if (!scopeId || k.startsWith(`${scopeId}::`)) entries.push({ key: k, count: v.count });
    }
    entries.sort((a, b) => b.count - a.count);
    res.json({ entries: entries.slice(0, 200) });
  } catch (err) {
    console.error('frequency snapshot error', err);
    res.status(500).json({ error: 'internal' });
  }
});

const port = process.env.FREQ_PORT || 4001;
app.listen(port, () => console.log(`Frequency server listening on ${port}`));

export default app;