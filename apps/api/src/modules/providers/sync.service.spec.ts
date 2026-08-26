import { withProviderRetries } from './sync.service.js';

describe('withProviderRetries', () => {
  it('retries transient provider failures with a bounded attempt count', async () => {
    const operation = jest.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValue('ok');
    await expect(withProviderRetries(operation, 2)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
