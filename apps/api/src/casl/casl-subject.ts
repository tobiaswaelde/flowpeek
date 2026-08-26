/** Resources protected by Flowpeek authorization policies. */
export enum CaslSubject {
  All = 'all',
  User = 'User',
  ProviderAccount = 'ProviderAccount',
  Repository = 'Repository',
  WorkflowRun = 'WorkflowRun',
  NotificationChannel = 'NotificationChannel',
  NotificationRule = 'NotificationRule',
  NotificationDelivery = 'NotificationDelivery',
  Settings = 'Settings',
}
