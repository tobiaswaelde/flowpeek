import { Module } from '@nestjs/common';

import { InitService } from './init.service.js';

@Module({ providers: [InitService] })
export class InitModule {}
