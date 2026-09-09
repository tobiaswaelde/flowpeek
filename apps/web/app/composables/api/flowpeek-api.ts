import type { AxiosResponse } from 'axios';

import { apiEndpoints } from '~/types/api/endpoints';
import type {
  CreateNotificationChannel,
  CreateNotificationRule,
  CreateProviderAccount,
  DashboardPeriodQuery,
  DashboardSummary,
  DashboardWorkflowRun,
  HealthResponse,
  NotificationChannel,
  NotificationDelivery,
  NotificationRule,
  PaginatedResource,
  ProviderAccount,
  ProviderAuthenticationOptions,
  ProviderOAuthAuthorization,
  ProviderRepository,
  Repository,
  RepositoryHealth,
  RepositoryMembership,
  StartProviderOAuth,
  UpdateNotificationChannel,
  UpdateNotificationRule,
  UpdateProviderAccount,
  User,
  WorkflowFilter,
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
      getRepositoryHealth: (query: DashboardPeriodQuery): Promise<AxiosResponse<RepositoryHealth[]>> =>
        api.get(apiEndpoints.dashboard.repositories, { params: query }),
      getSummary: (query: DashboardPeriodQuery): Promise<AxiosResponse<DashboardSummary>> =>
        api.get(apiEndpoints.dashboard.summary, { params: query }),
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
      authorize: (input: StartProviderOAuth): Promise<AxiosResponse<ProviderOAuthAuthorization>> =>
        api.post(apiEndpoints.providerAccounts.authorize, input),
      authenticationOptions: (): Promise<AxiosResponse<ProviderAuthenticationOptions>> =>
        api.get(apiEndpoints.providerAccounts.authenticationOptions),
      create: (input: CreateProviderAccount): Promise<AxiosResponse<ProviderAccount>> =>
        api.post(apiEndpoints.providerAccounts.base, input),
      delete: (id: string): Promise<AxiosResponse<void>> => api.delete(`${apiEndpoints.providerAccounts.base}/${id}`),
      list: (): Promise<AxiosResponse<PaginatedResource<ProviderAccount>>> =>
        api.get(apiEndpoints.providerAccounts.base, {
          params: { fields: 'id,displayName,providerType,enabled', page: 1, perPage: 100 },
        }),
      listRepositories: (id: string): Promise<AxiosResponse<ProviderRepository[]>> =>
        api.get(`${apiEndpoints.providerAccounts.base}/${id}/repositories`),
      addRepository: (id: string, providerRepositoryId: string): Promise<AxiosResponse<Repository>> =>
        api.post(`${apiEndpoints.providerAccounts.base}/${id}/repositories`, { providerRepositoryId }),
      update: (id: string, input: UpdateProviderAccount): Promise<AxiosResponse<ProviderAccount>> =>
        api.patch(`${apiEndpoints.providerAccounts.base}/${id}`, input),
    },
    repositories: {
      createWorkflowFilter: (
        id: string,
        input: Pick<WorkflowFilter, 'mode' | 'pattern'>,
      ): Promise<AxiosResponse<WorkflowFilter>> =>
        api.post(`${apiEndpoints.repositories}/${id}/workflow-filters`, input),
      deleteMembership: (id: string, userId: string): Promise<AxiosResponse<void>> =>
        api.delete(`${apiEndpoints.repositories}/${id}/memberships/${userId}`),
      deleteWorkflowFilter: (id: string, filterId: string): Promise<AxiosResponse<void>> =>
        api.delete(`${apiEndpoints.repositories}/${id}/workflow-filters/${filterId}`),
      get: (id: string): Promise<AxiosResponse<Repository>> => api.get(`${apiEndpoints.repositories}/${id}`),
      listMemberships: (id: string): Promise<AxiosResponse<RepositoryMembership[]>> =>
        api.get(`${apiEndpoints.repositories}/${id}/memberships`),
      listWorkflowFilters: (id: string): Promise<AxiosResponse<WorkflowFilter[]>> =>
        api.get(`${apiEndpoints.repositories}/${id}/workflow-filters`),
      update: (
        id: string,
        input: { enabled: boolean; workflowRunRetentionDays: number | null },
      ): Promise<AxiosResponse<void>> => api.patch(`${apiEndpoints.repositories}/${id}`, input),
      upsertMembership: (
        id: string,
        userId: string,
        input: Pick<RepositoryMembership, 'role'>,
      ): Promise<AxiosResponse<RepositoryMembership>> =>
        api.put(`${apiEndpoints.repositories}/${id}/memberships/${userId}`, input),
    },
    users: {
      delete: (id: string): Promise<AxiosResponse<void>> => api.delete(`${apiEndpoints.users}/${id}`),
      list: (): Promise<AxiosResponse<PaginatedResource<User>>> =>
        api.get(apiEndpoints.users, {
          params: { fields: 'id,username,role,createdAt,updatedAt', page: 1, perPage: 100 },
        }),
    },
  };
}
