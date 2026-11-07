const { add } = require('../src/math');

describe('skipped', () => {
  it.skip('is not run', () => {
    expect(add(1, 1)).toBe(2);
  });
  it('runs', () => {
    expect(true).toBe(true);
  });
});
