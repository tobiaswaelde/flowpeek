<template>
  <USelect
    v-model="value"
    :disabled="disabled"
    :items="items"
    :placeholder="placeholder"
    label-key="label"
    value-key="value"
  />
</template>

<script setup lang="ts">
import { useProviderType } from '~/composables/enums/provider-type';
import { providerTypes, type ProviderType } from '~/types/api/resources';

defineProps<{
  disabled?: boolean;
  placeholder?: string;
}>();

const value = defineModel<ProviderType | undefined>({ default: undefined });
const { getIcon, getLabel } = useProviderType();

const items = computed(() =>
  providerTypes.map((providerType) => ({
    icon: getIcon(providerType),
    label: getLabel(providerType),
    value: providerType,
  })),
);
</script>
