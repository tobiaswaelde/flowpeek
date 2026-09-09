import { describe, expect, it } from 'vitest';

import { rankSearchResults } from './global-search-ranking';

interface ResultFixture {
  context?: string;
  id: string;
  label: string;
}

describe('global search ranking', () => {
  const getSearchText = (item: ResultFixture) => ({
    id: item.id,
    label: item.label,
    supportingText: item.context,
  });

  it('ranks exact, prefix, word-prefix, label, and contextual matches deterministically', () => {
    const items: ResultFixture[] = [
      { context: 'deploy production', id: '5', label: 'Nightly checks' },
      { id: '4', label: 'Nightly deployment' },
      { id: '3', label: 'Production deploy' },
      { id: '2', label: 'Deploy preview' },
      { id: '1', label: 'deploy' },
    ];

    expect(rankSearchResults(items, 'deploy', getSearchText)).toEqual([
      items[4],
      items[3],
      items[2],
      items[1],
      items[0],
    ]);
  });

  it('bounds every result group after applying ranking', () => {
    const items = Array.from({ length: 10 }, (_, index) => ({ id: String(index), label: `Result ${index}` }));
    expect(rankSearchResults(items, 'result', getSearchText, 3)).toHaveLength(3);
  });
});
