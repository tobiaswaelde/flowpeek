<template>
  <UCard :ui="{ body: 'space-y-4' }">
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="font-semibold">{{ $t('mcp.title') }}</h2>
          <p class="text-sm text-muted">{{ $t('mcp.description') }}</p>
        </div>
        <UButton icon="i-lucide-plus" :label="$t('mcp.create')" @click="createDialogOpen = true" />
      </div>
    </template>

    <UAlert v-if="loadError" color="error" icon="i-lucide-circle-alert" variant="subtle" :title="$t('mcp.loadError')">
      <template #actions>
        <UButton color="error" size="xs" variant="soft" :label="$t('mcp.retry')" @click="load" />
      </template>
    </UAlert>
    <div v-else-if="loading" class="space-y-3">
      <USkeleton v-for="index in 2" :key="index" class="h-16 w-full" />
    </div>
    <p v-else-if="tokens.length === 0" class="text-sm text-muted">{{ $t('mcp.empty') }}</p>
    <ul v-else class="divide-y divide-default" :aria-label="$t('mcp.title')">
      <li v-for="token in tokens" :key="token.id" class="flex flex-wrap items-center justify-between gap-4 py-3">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-medium">{{ token.name }}</span>
            <UBadge variant="subtle" :color="statusColor(token.status)">{{ $t(`mcp.status.${token.status}`) }}</UBadge>
          </div>
          <p class="mt-1 font-mono text-xs text-muted">{{ token.tokenPrefix }}…</p>
          <p class="mt-1 text-xs text-muted">
            {{ $t('mcp.createdAt', { date: formatTimestamp(token.createdAt) }) }} ·
            {{
              token.lastUsedAt ? $t('mcp.lastUsedAt', { date: formatTimestamp(token.lastUsedAt) }) : $t('mcp.neverUsed')
            }}
            ·
            {{
              token.expiresAt ? $t('mcp.expiresAt', { date: formatTimestamp(token.expiresAt) }) : $t('mcp.neverExpires')
            }}
          </p>
        </div>
        <UButton
          color="error"
          icon="i-lucide-ban"
          size="sm"
          variant="soft"
          :disabled="token.status === 'REVOKED'"
          :label="$t('mcp.revoke')"
          :loading="revokingId === token.id"
          @click="revoke(token)"
        />
      </li>
    </ul>
  </UCard>

  <UModal
    v-model:open="createDialogOpen"
    :description="$t('mcp.createDescription')"
    :dismissible="!creating"
    :title="$t('mcp.createTitle')"
  >
    <template #body>
      <UAlert
        v-if="createError"
        class="mb-4"
        color="error"
        icon="i-lucide-circle-alert"
        variant="subtle"
        :title="$t('mcp.createError')"
      />
      <UAlert
        v-if="createdToken"
        class="mb-4"
        color="warning"
        icon="i-lucide-key-round"
        variant="subtle"
        :description="$t('mcp.secretDescription')"
        :title="$t('mcp.secretTitle')"
      />
      <div v-if="createdToken" class="space-y-4">
        <UFormField :label="$t('mcp.token')">
          <UInput class="w-full font-mono" readonly :model-value="createdToken">
            <template #trailing>
              <UButton
                color="neutral"
                size="xs"
                variant="ghost"
                :aria-label="$t('mcp.copy')"
                :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                @click="copyToken"
              />
            </template>
          </UInput>
        </UFormField>
        <div class="flex justify-end">
          <UButton color="neutral" variant="soft" :label="$t('mcp.done')" @click="closeCreateDialog" />
        </div>
      </div>
      <UForm v-else class="space-y-4" :state="form" @submit="createToken">
        <UFormField name="name" :label="$t('mcp.name')" required>
          <UInput v-model="form.name" class="w-full" maxlength="100" :placeholder="$t('mcp.namePlaceholder')" />
        </UFormField>
        <UFormField name="expiresAt" :help="$t('mcp.expirationHelp')" :label="$t('mcp.expiration')">
          <UInput v-model="form.expiresAt" class="w-full" type="datetime-local" />
        </UFormField>
        <div class="flex justify-end border-t border-default pt-4">
          <UButton type="submit" :disabled="!form.name.trim()" :label="$t('mcp.create')" :loading="creating" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';

import { useEzRepoApi } from '~/composables/api/ezrepo-api';
import { useDateTime } from '~/composables/use-date-time';
import type { McpAccessToken, McpAccessTokenStatus } from '~/types/api/resources';

const { t } = useI18n();
const api = useEzRepoApi();
const { formatDateTime } = useDateTime();
const tokens = ref<McpAccessToken[]>([]);
const loading = ref(false);
const loadError = ref(false);
const createDialogOpen = ref(false);
const creating = ref(false);
const createError = ref(false);
const createdToken = ref('');
const copied = ref(false);
const revokingId = ref<string>();
const form = reactive({ expiresAt: '', name: '' });

watch(createDialogOpen, (open) => {
  if (!open) return;
  Object.assign(form, { expiresAt: '', name: '' });
  createdToken.value = '';
  createError.value = false;
  copied.value = false;
});

function formatTimestamp(timestamp: string): string {
  return formatDateTime(timestamp);
}

function statusColor(status: McpAccessTokenStatus): 'error' | 'neutral' | 'success' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'REVOKED') return 'error';
  return 'neutral';
}

async function load(): Promise<void> {
  loading.value = true;
  loadError.value = false;
  try {
    tokens.value = (await api.mcpTokens.list()).data;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

async function createToken(): Promise<void> {
  creating.value = true;
  createError.value = false;
  try {
    const { data } = await api.mcpTokens.create({
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      name: form.name.trim(),
    });
    createdToken.value = data.token;
    await load();
  } catch {
    createError.value = true;
  } finally {
    creating.value = false;
  }
}

async function copyToken(): Promise<void> {
  await navigator.clipboard.writeText(createdToken.value);
  copied.value = true;
}

function closeCreateDialog(): void {
  createDialogOpen.value = false;
}

async function revoke(token: McpAccessToken): Promise<void> {
  if (!window.confirm(t('mcp.revokeConfirm', { name: token.name }))) return;
  revokingId.value = token.id;
  try {
    await api.mcpTokens.revoke(token.id);
    await load();
  } finally {
    revokingId.value = undefined;
  }
}

onMounted(() => void load());
</script>
