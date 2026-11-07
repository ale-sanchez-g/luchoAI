import { call } from '../lib/api';

jest.mock('http-client');

describe('call', () => {
  it('works', async () => {
    await call('/x');
  });
});
