import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { SystemStatusGateway } from './system-status.gateway.js';
import { SystemStatusService } from './system-status.service.js';

@Module({
  imports: [AuthModule],
  providers: [SystemStatusGateway, SystemStatusService],
  exports: [SystemStatusService],
})
export class SystemStatusModule {}
