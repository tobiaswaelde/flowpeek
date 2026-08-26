import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { PoliciesGuard } from '../../casl/policies.guard.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

/** Require a valid bearer token and make CASL policies available to an endpoint. */
export const Authenticated = () => applyDecorators(UseGuards(JwtAuthGuard, PoliciesGuard), ApiBearerAuth());
