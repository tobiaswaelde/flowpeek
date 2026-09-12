import { VersionService } from './version.service.js';

describe('VersionService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns the latest GitHub release without its tag prefix and caches it', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ tag_name: 'v1.2.3' }),
      ok: true,
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const service = new VersionService();

    await expect(service.getLatest()).resolves.toEqual({ latest: '1.2.3' });
    await expect(service.getLatest()).resolves.toEqual({ latest: '1.2.3' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/tobiaswaelde/ezrepo/releases/latest', {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ezrepo' },
    });
  });

  it('returns null when the release lookup fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    await expect(new VersionService().getLatest()).resolves.toEqual({ latest: null });
  });
});
