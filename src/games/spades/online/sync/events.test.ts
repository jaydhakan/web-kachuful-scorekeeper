import { pingRev } from './events';

describe('pingRev', () => {
  it('reads the table rev a ping carries', () => {
    expect(pingRev('{"rev":12}')).toBe(12);
    expect(pingRev('{"rev":0}')).toBe(0);
  });

  it("is null for an older server's empty ping, bad JSON, and anything that is not a whole number", () => {
    for (const d of ['{}', '', 'nope', 'null', '[]', '{"rev":"3"}', '{"rev":1.5}', '{"rev":null}'])
      expect(pingRev(d)).toBeNull();
  });
});
