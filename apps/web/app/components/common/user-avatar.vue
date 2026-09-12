<template>
  <UAvatar :alt="username" :size="size" :src="source" :text="initials" />
</template>

<script setup lang="ts">
import type { AvatarProps } from '#ui/components/Avatar.vue';
import { computed, ref, watch } from 'vue';

import { useAvatarImages } from '~/composables/app/avatar-images';

const props = withDefaults(
  defineProps<{
    avatarUpdatedAt?: string | null;
    size?: AvatarProps['size'];
    userId: string;
    username: string;
  }>(),
  { size: 'md' },
);

const { load } = useAvatarImages();
const source = ref<string>();
const initials = computed(() => {
  const parts = props.username
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (parts.length > 1) return `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}`.toUpperCase();
  return props.username.slice(0, 2).toUpperCase();
});
let loadSequence = 0;

watch(
  () => [props.userId, props.avatarUpdatedAt] as const,
  async ([userId, avatarUpdatedAt]) => {
    const sequence = ++loadSequence;
    const loadedSource = await load(userId, avatarUpdatedAt);
    if (sequence === loadSequence) source.value = loadedSource;
  },
  { immediate: true },
);
</script>
