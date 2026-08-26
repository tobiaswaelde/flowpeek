<script setup lang="ts">
import type { WorkflowRunTrendBucket } from '~/types/api/resources';

const props = defineProps<{ buckets: WorkflowRunTrendBucket[] }>();

const points = computed(() => {
  const maximum = Math.max(1, ...props.buckets.flatMap((bucket) => [bucket.successCount, bucket.errorCount]));
  const denominator = Math.max(1, props.buckets.length - 1);
  const createPoints = (key: 'errorCount' | 'successCount') =>
    props.buckets
      .map((bucket, index) => `${(index / denominator) * 100},${100 - (bucket[key] / maximum) * 100}`)
      .join(' ');
  return { errors: createPoints('errorCount'), successes: createPoints('successCount') };
});
</script>

<template>
  <div v-if="buckets.length" class="space-y-4">
    <svg aria-hidden="true" class="h-56 w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
      <path
        d="M 0 100 H 100"
        fill="none"
        stroke="currentColor"
        class="text-default/30"
        vector-effect="non-scaling-stroke"
      />
      <polyline
        fill="none"
        :points="points.successes"
        stroke="var(--ui-success)"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
      <polyline
        fill="none"
        :points="points.errors"
        stroke="var(--ui-error)"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
    </svg>
    <div class="flex gap-5 text-sm text-muted">
      <span class="flex items-center gap-2"
        ><i class="size-2 rounded-full bg-success" />{{ $t('dashboard.success') }}</span
      >
      <span class="flex items-center gap-2"
        ><i class="size-2 rounded-full bg-error" />{{ $t('dashboard.errors') }}</span
      >
    </div>
  </div>
  <p v-else class="py-16 text-center text-sm text-muted">{{ $t('dashboard.noTrendData') }}</p>
</template>
