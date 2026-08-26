import { SetMetadata } from '@nestjs/common';

import type { AppAbility } from './types.js';

export const CHECK_POLICIES_KEY = 'flowpeek:check-policies';

/** A predicate that must allow the current request's resolved CASL ability. */
export type PolicyHandler = (ability: AppAbility) => boolean;

/** Require every supplied policy predicate before an endpoint can execute. */
export const CheckPolicies = (...handlers: PolicyHandler[]) => SetMetadata(CHECK_POLICIES_KEY, handlers);
