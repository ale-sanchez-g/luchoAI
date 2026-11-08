jest.mock('vuln-lib', () => ({ fetch: (url) => `fetched ${url}` }), { virtual: true });

const { get } = require('../src/lib/http');

describe('http', () => {
  it('fetches through vuln-lib', () => {
    expect(get('/a')).toBe('fetched /a');
  });
});
