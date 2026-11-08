const { brokenSum } = require('../src/broken');

describe('broken', () => {
  it('fails', () => {
    expect(brokenSum(2, 2)).toBe(4);
  });
});
