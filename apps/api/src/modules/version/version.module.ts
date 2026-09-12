import { Module } from '@nestjs/common';

import { CaslModule } from '../../casl/casl.module.js';
import { VersionController } from './version.controller.js';
import { VersionService } from './version.service.js';

@Module({
  imports: [CaslModule],
  controllers: [VersionController],
  providers: [VersionService],
})
export class VersionModule {}
