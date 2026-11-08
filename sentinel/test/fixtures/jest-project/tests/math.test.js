const { add, divide } = require('../src/math');
const data = require('../src/data');
const { used } = require('../src/partial');

describe('math', () => {
  it('adds', () => {
    expect(add(1, 2)).toBe(3);
  });
  it('divides and rejects zero', () => {
    expect(divide(6, 3)).toBe(2);
    expect(() => divide(1, 0)).toThrow('division by zero');
  });
  it('reads data and doubles', () => {
    expect(data.colours).toHaveLength(3);
    expect(used(2)).toBe(4);
  });
});
