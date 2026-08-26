import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

export interface HealthResponse {
  status: 'ok';
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @Version(VERSION_NEUTRAL)
  @ApiOperation({ summary: 'Get application health status' })
  @ApiOkResponse({
    description: 'The API process is running.',
    schema: {
      example: { status: 'ok' },
    },
  })
  getHealth(): HealthResponse {
    return { status: 'ok' };
  }
}
