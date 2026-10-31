import { hashUuid, uuid, UUID_RE } from './ids';

describe('ids', () => {
  it('makes random UUIDs', () => {
    const a = uuid();
    expect(a).toMatch(UUID_RE);
    expect(uuid()).not.toBe(a);
  });

  it('hashes the same input to the same UUID, and different inputs apart', () => {
    expect(hashUuid('dev:g1:1')).toBe(hashUuid('dev:g1:1'));
    expect(hashUuid('dev:g1:1')).toMatch(UUID_RE);
    const seen = new Set(Array.from({ length: 2000 }, (_, i) => hashUuid(`d:g${i}:${i * 7}`)));
    expect(seen.size).toBe(2000);
  });
});
