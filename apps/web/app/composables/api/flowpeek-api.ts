import type { AxiosResponse } from 'axios';

import { apiEndpoints } from '~/types/api/endpoints';
import type {
  CreateNotificationChannel,
  CreateNotificationRule,
  CreateProviderAccount,
  DashboardWorkflowRun,
  HealthResponse,
  NotificationChannel,
  NotificationDelivery,
  NotificationRule,
  ProviderAccount,
  Repository,
  UpdateNotificationChannel,
  UpdateNotificationRule,
  UpdateProviderAccount,
  User,
  WorkflowRunTrendBucket,
  WorkflowRunTrendQuery,
} from '~/types/api/resources';
import { useApi } from './api';

/** Provide typed methods for Flowpeek's non-Query-Kit API endpoints. */
export function useFlowpeekApi() {
  const api = useApi();

  return {
    dashboard: {
      getFailures: (): Promise<AxiosResponse<DashboardWorkflowRun[]>> => api.get(apiEndpoints.dashboard.failures),
      getLatestRuns: (): Promise<AxiosResponse<DashboardWorkflowRun[]>> => api.get(apiEndpoints.dashboard.latestRuns),
      getTrend: (query: WorkflowRunTrendQuery): Promise<AxiosResponse<WorkflowRunTrendBucket[]>> =>
        api.get(apiEndpoints.dashboard.trend, { params: query }),
    },
    health: (): Promise<AxiosResponse<HealthResponse>> => api.get(apiEndpoints.health),
    notificationChannels: {
      create: (input: CreateNotificationChannel): Promise<AxiosResponse<NotificationChannel>> =>
        api.post(apiEndpoints.notificationChannels, input),
      delete: (id: string): Promise<AxiosResponse<void>> => api.delete(`${apiEndpoints.notificationChannels}/${id}`),
      list: (repositoryId?: string): Promise<AxiosResponse<NotificationChannel[]>> =>
        api.get(apiEndpoints.notificationChannels, { params: { repositoryId } }),
      update: (id: string, input: UpdateNotificationChannel): Promise<AxiosResponse<NotificationChannel>> =>
        api.patch(`${apiEndpoints.notificationChannels}/${id}`, input),
    },
    notificationDeliveries: {
      list: (repositoryId?: string): Promise<AxiosResponse<NotificationDelivery[]>> =>
        api.get(apiEndpoints.notificationDeliveries, { params: { repositoryId } }),
    },
    notificationRules: {
      create: (input: CreateNotificationRule): Promise<AxiosResponse<NotificationRule>> =>
        api.post(apiEndpoints.notificationRules, input),
      delete: (id: string): Promise<AxiosResponse<void>> => api.delete(`${apiEndpoints.notificationRules}/${id}`),
      list: (repositoryId?: string): Promise<AxiosResponse<NotificationRule[]>> =>
        api.get(apiEndpoints.notificationRules, { params: { repositoryId } }),
      update: (id: string, input: UpdateNotificationRule): Promise<AxiosResponse<NotificationRule>> =>
        api.patch(`${apiEndpoints.notificationRules}/${id}`, input),
    },
    providerAccounts: {
      create: (input: CreateProviderAccount): Promise<AxiosResponse<ProviderAccount>> =>
        api.post(apiEndpoints.providerAccounts, input),
      delete: (id: string): Promise<AxiosResponse<void>> => api.delete(`${apiEndpoints.providerAccounts}/${id}`),
      list: (): Promise<AxiosResponse<ProviderAccount[]>> => api.get(apiEndpoints.providerAccounts),
      update: (id: string, input: UpdateProviderAccount): Promise<AxiosResponse<ProviderAccount>> =>
        api.patch(`${apiEndpoints.providerAccounts}/${id}`, input),
    },
    repositories: {
      list: (): Promise<AxiosResponse<Repository[]>> => api.get(apiEndpoints.repositories),
      update: (
        id: string,
        input: Pick<Repository, 'enabled' | 'workflowRunRetentionDays'>,
      ): Promise<AxiosResponse<Repository>> => api.patch(`${apiEndpoints.repositories}/${id}`, input),
    },
    users: {
      list: (): Promise<AxiosResponse<User[]>> => api.get(apiEndpoints.users),
      delete: (id: string): Promise<AxiosResponse<void>> => api.delete(`${apiEndpoints.users}/${id}`),
    },
  };
}
