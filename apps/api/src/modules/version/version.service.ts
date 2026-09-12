import { Injectable } from '@nestjs/common';

const releasesUrl = 'https://api.github.com/repos/tobiaswaelde/ezrepo/releases/latest';
const cacheTtl = 5 * 60 * 1000;

interface CachedVersion {
  latest: string | null;
  timestamp: number;
}

/** Extract a SemVer value from GitHub tags created manually or by Changesets. */
export function parseReleaseVersion(tagName: string | undefined): string | null {
  return tagName?.match(/(?:^|@)v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/)?.[1] ?? null;
}

/** Resolves the latest published ezRepo version without exposing GitHub failures to clients. */
@Injectable()
export class VersionService {
  private cached: CachedVersion | undefined;
  private pending: Promise<{ latest: string | null }> | undefined;

  /** Return the newest GitHub Release version, cached for five minutes. */
  async getLatest(): Promise<{ latest: string | null }> {
    if (this.cached && Date.now() - this.cached.timestamp < cacheTtl) return { latest: this.cached.latest };

    this.pending ??= this.fetchLatest().finally(() => {
      this.pending = undefined;
    });
    const result = await this.pending;
    if (result.latest) this.cached = { ...result, timestamp: Date.now() };
    return result;
  }

  private async fetchLatest(): Promise<{ latest: string | null }> {
    try {
      const response = await fetch(releasesUrl, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ezrepo' },
      });
      if (!response.ok) return { latest: null };
      const release = (await response.json()) as { tag_name?: string };
      return { latest: parseReleaseVersion(release.tag_name) };
    } catch {
      return { latest: null };
    }
  }
}
