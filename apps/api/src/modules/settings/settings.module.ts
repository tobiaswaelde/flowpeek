import { Module } from '@nestjs/common';

import { CaslModule } from '../../casl/casl.module.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  controllers: [SettingsController],
  imports: [CaslModule],
  providers: [SettingsService],
})
export class SettingsModule {}
