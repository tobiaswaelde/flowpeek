import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { JobRunnerService } from './job-runner.service.js';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [JobRunnerService],
  exports: [JobRunnerService],
})
export class JobsModule {}
