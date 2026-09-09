import { Injectable } from '@nestjs/common';

import { DefaultDateTimeFormat } from '../../generated/prisma/client.js';
import { DEFAULT_WORKFLOW_RUN_RETENTION_DAYS } from '../../jobs/workflow-run-retention.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ApplicationSettingsDto, UpdateApplicationSettingsDto } from './dto/application-settings.dto.js';

const GLOBAL_SETTINGS_KEY = 'global';

/** Reads and persists the singleton application-wide settings record. */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Return persisted settings or the database defaults before the first update. */
  async get(): Promise<ApplicationSettingsDto> {
    const settings = await this.prisma.applicationSettings.findUnique({ where: { key: GLOBAL_SETTINGS_KEY } });
    return {
      dateTimeFormat: settings?.dateTimeFormat ?? DefaultDateTimeFormat.LOCALE_MEDIUM,
      workflowRunRetentionDays: settings?.workflowRunRetentionDays ?? DEFAULT_WORKFLOW_RUN_RETENTION_DAYS,
    };
  }

  /** Persist all mutable application-wide settings in the singleton record. */
  async update(input: UpdateApplicationSettingsDto): Promise<ApplicationSettingsDto> {
    const settings = await this.prisma.applicationSettings.upsert({
      create: { key: GLOBAL_SETTINGS_KEY, ...input },
      update: input,
      where: { key: GLOBAL_SETTINGS_KEY },
    });
    return {
      dateTimeFormat: settings.dateTimeFormat,
      workflowRunRetentionDays: settings.workflowRunRetentionDays,
    };
  }
}
