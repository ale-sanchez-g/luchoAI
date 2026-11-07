const formatter = require('../src/format');

describe('format module', () => {
  it('exports a function', () => {
    expect(typeof formatter.format).toBe('function');
  });
});
