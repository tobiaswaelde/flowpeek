import type { MongoAbility } from '@casl/ability';

import type { CaslAction } from './casl-action.js';
import type { CaslSubject } from './casl-subject.js';

/** The CASL ability used by Flowpeek API policies and query restrictions. */
export type AppAbility = MongoAbility<[CaslAction, CaslSubject]>;
