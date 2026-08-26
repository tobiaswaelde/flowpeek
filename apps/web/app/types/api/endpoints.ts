import type { EndpointDefinition } from '@querry-kit/nuxt/types';

import type {
  CreateNotificationChannel,
  CreateNotificationRule,
  NotificationChannel,
  NotificationRule,
  UpdateNotificationChannel,
  UpdateNotificationRule,
  WorkflowRun,
} from './resources';

/** Relative paths for every Flowpeek endpoint exposed to the web application. */
export const apiEndpoints = {
  auth: {
    currentUser: '/auth/me',
    password: '/auth/password',
    signIn: '/auth/signin',
    signOut: '/auth/signout',
  },
  dashboard: {
    failures: '/dashboard/failures',
    latestRuns: '/dashboard/latest-runs',
    trend: '/dashboard/trend',
  },
  health: '/health',
  notificationChannels: '/notification-channels',
  notificationDeliveries: '/notification-deliveries',
  notificationRules: '/notification-rules',
  providerAccounts: '/provider-accounts',
  repositories: '/repositories',
  users: '/users',
  workflowRuns: 'workflow-runs',
} as const;

/** Resource endpoints that use the shared Query Kit pagination contract. */
export interface Endpoints {
  'workflow-runs': {
    create: never;
    dto: WorkflowRun;
    update: never;
  };
}

/** Name of a resource endpoint that uses the shared Query Kit pagination contract. */
export type Endpoint = keyof Endpoints;

type ToQueryKitEndpoint<TEndpoint> = TEndpoint extends {
  create: infer Create;
  dto: infer Item;
  update: infer Update;
}
  ? EndpointDefinition<Item, Create, Update>
  : never;

/** Query Kit-compatible representation of Flowpeek's paginated resource endpoints. */
export type QueryKitEndpoints = {
  [TEndpoint in Endpoint]: ToQueryKitEndpoint<Endpoints[TEndpoint]>;
};

/** Notification resource mutation contracts for endpoint-specific API wrappers. */
export interface NotificationEndpointContracts {
  notificationChannels: {
    create: CreateNotificationChannel;
    item: NotificationChannel;
    update: UpdateNotificationChannel;
  };
  notificationRules: {
    create: CreateNotificationRule;
    item: NotificationRule;
    update: UpdateNotificationRule;
  };
}
