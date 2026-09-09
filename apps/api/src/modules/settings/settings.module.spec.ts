import { Test } from '@nestjs/testing';

import { PrismaModule } from '../../prisma/prisma.module.js';
import { SettingsController } from './settings.controller.js';
import { SettingsModule } from './settings.module.js';
import { UserPreferencesController } from './user-preferences.controller.js';

describe('SettingsModule', () => {
  it('resolves authenticated controller guards and services', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [PrismaModule, SettingsModule] }).compile();

    expect(moduleRef.get(SettingsController)).toBeInstanceOf(SettingsController);
    expect(moduleRef.get(UserPreferencesController)).toBeInstanceOf(UserPreferencesController);

    await moduleRef.close();
  });
});
