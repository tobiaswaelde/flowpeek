import { Module } from '@nestjs/common';

import { CaslModule } from '../../casl/casl.module.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { UserPreferencesController } from './user-preferences.controller.js';
import { UserPreferencesService } from './user-preferences.service.js';

@Module({
  controllers: [SettingsController, UserPreferencesController],
  imports: [CaslModule],
  providers: [SettingsService, UserPreferencesService],
})
export class SettingsModule {}
