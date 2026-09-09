import { describe, expect, it, vi } from 'vitest';

import { usePendingActions } from './use-pending-actions';

describe('usePendingActions', () => {
  it('tracks each action until its promise settles and ignores duplicate runs', async () => {
    let resolveAction: ((value: string) => void) | undefined;
    const action = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveAction = resolve;
        }),
    );
    const duplicateAction = vi.fn(async () => 'duplicate');
    const { isPending, run } = usePendingActions();

    const result = run('repository:1', action);
    expect(isPending('repository:1')).toBe(true);
    await expect(run('repository:1', duplicateAction)).resolves.toBeUndefined();
    expect(duplicateAction).not.toHaveBeenCalled();

    resolveAction?.('complete');
    await expect(result).resolves.toBe('complete');
    expect(isPending('repository:1')).toBe(false);
  });

  it('clears pending state when an action fails', async () => {
    const { isPending, run } = usePendingActions();

    await expect(run('repository:1', async () => Promise.reject(new Error('request failed')))).rejects.toThrow(
      'request failed',
    );
    expect(isPending('repository:1')).toBe(false);
  });
});
