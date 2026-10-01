import assert from 'assert';
import { Experience } from './schemas/experience';
import { adjustConfidence, toState } from './services/confidence';
import { normalizeDate } from './services/dates';
import { calculateFingerprint } from './services/deduplication';

const base: Experience = {
  title: 'Mindfulness Weekend Retreat',
  description: 'A retreat.',
  date: '2026-09-12T14:00:00Z',
  location: 'Rishikesh, India',
  price: 12000,
  url: 'https://organizer.com/mindfulness-retreat',
  category: 'Personal Growth',
  sourceUrl: 'https://some-events-aggregator.com/event/123',
  relevant: true,
};

assert.equal(adjustConfidence(base), 1);
assert.equal(toState(true, 1), 'draft');

const incomplete: Experience = { ...base, date: null, price: null };
const conf = adjustConfidence(incomplete);
assert.ok(conf < 0.7);
assert.equal(toState(true, conf), 'review');

assert.equal(toState(false, 1), 'rejected');

assert.equal(normalizeDate('2026-09-12T14:00:00Z'), '2026-09-12T14:00:00Z');
assert.equal(normalizeDate('This Saturday'), null);

assert.equal(
  calculateFingerprint(base),
  calculateFingerprint({ ...base, title: '  Mindfulness Weekend Retreat  ' }),
);
assert.notEqual(
  calculateFingerprint(base),
  calculateFingerprint({ ...base, title: 'Other' }),
);

console.log('checks passed');
