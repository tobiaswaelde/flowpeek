const maximumGroupResults = 6;

/** Rank exact and prefix matches ahead of other matches with a stable label/id tie-breaker. */
export function rankSearchResults<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => { id: string; label: string; supportingText?: string },
  limit = maximumGroupResults,
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const rank = (value: T): [number, string, string] => {
    const { id, label, supportingText = '' } = getSearchText(value);
    const normalizedLabel = label.toLocaleLowerCase();
    const normalizedSupportingText = supportingText.toLocaleLowerCase();
    const words = normalizedLabel.split(/\s|\//u);
    const score =
      normalizedLabel === normalizedQuery
        ? 0
        : normalizedLabel.startsWith(normalizedQuery)
          ? 1
          : words.includes(normalizedQuery)
            ? 2
            : words.some((word) => word.startsWith(normalizedQuery))
              ? 3
              : normalizedLabel.includes(normalizedQuery)
                ? 4
                : normalizedSupportingText.startsWith(normalizedQuery)
                  ? 5
                  : 6;
    return [score, normalizedLabel, id];
  };

  return [...items]
    .sort((left, right) => {
      const [leftScore, leftLabel, leftId] = rank(left);
      const [rightScore, rightLabel, rightId] = rank(right);
      return leftScore - rightScore || leftLabel.localeCompare(rightLabel) || leftId.localeCompare(rightId);
    })
    .slice(0, limit);
}
