import { validate } from 'class-validator';

import { IntroBannerParamsDto } from './user-preferences.dto.js';

describe('IntroBannerParamsDto', () => {
  it('accepts a stable kebab-case banner identifier', async () => {
    const input = Object.assign(new IntroBannerParamsDto(), { bannerId: 'repository-details' });

    await expect(validate(input)).resolves.toHaveLength(0);
  });

  it.each(['Dashboard', 'dashboard/settings', '', 'a'.repeat(101)])(
    'rejects the unsafe banner identifier %s',
    async (bannerId) => {
      const input = Object.assign(new IntroBannerParamsDto(), { bannerId });

      await expect(validate(input)).resolves.not.toHaveLength(0);
    },
  );
});
