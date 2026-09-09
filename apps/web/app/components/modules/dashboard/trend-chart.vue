<template>
  <div v-if="loading && !buckets.length" class="space-y-4">
    <USkeleton class="h-64 w-full" />
    <USkeleton class="h-5 w-64" />
  </div>
  <div v-else-if="buckets.length" class="space-y-4">
    <div class="overflow-x-auto pb-1">
      <svg class="h-64 min-w-[40rem] w-full" viewBox="0 0 720 260" role="img" :aria-label="chartLabel">
        <g aria-hidden="true">
          <line
            v-for="tick in successTicks"
            :key="`success-grid-${tick.value}`"
            stroke="var(--ui-border)"
            stroke-width="1"
            :x1="plot.left"
            :x2="plot.right"
            :y1="tick.y"
            :y2="tick.y"
          />
          <text
            v-for="tick in successTicks"
            :key="`success-label-${tick.value}`"
            class="text-[10px]"
            fill="var(--ui-text-muted)"
            text-anchor="end"
            :x="plot.left - 9"
            :y="tick.y + 3"
          >
            {{ formatNumber(tick.value) }}
          </text>
          <text
            v-for="tick in errorTicks"
            :key="`error-label-${tick.value}`"
            class="text-[10px]"
            fill="var(--ui-error)"
            :x="plot.right + 9"
            :y="tick.y + 3"
          >
            {{ formatNumber(tick.value) }}
          </text>

          <rect
            v-for="point in chartPoints"
            :key="`success-${point.bucket.bucketStart}`"
            class="fill-success/55"
            rx="2"
            :height="point.successHeight"
            :width="barWidth"
            :x="point.x - barWidth / 2"
            :y="point.successY"
          >
            <title>{{ bucketTooltip(point.bucket) }}</title>
          </rect>
          <polyline
            fill="none"
            stroke="var(--ui-error)"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            vector-effect="non-scaling-stroke"
            :points="errorPolyline"
          />
          <circle
            v-for="point in chartPoints"
            :key="`error-${point.bucket.bucketStart}`"
            fill="var(--ui-error)"
            r="3"
            stroke="var(--ui-bg)"
            stroke-width="1"
            vector-effect="non-scaling-stroke"
            :cx="point.x"
            :cy="point.errorY"
          >
            <title>{{ bucketTooltip(point.bucket) }}</title>
          </circle>
          <text
            v-for="label in xLabels"
            :key="label.bucketStart"
            class="text-[10px]"
            fill="var(--ui-text-muted)"
            :text-anchor="label.anchor"
            :x="label.x"
            :y="plot.bottom + 24"
          >
            {{ label.text }}
          </text>
          <text class="text-[10px]" fill="var(--ui-text-muted)" y="12" :x="plot.left">
            {{ $t('dashboard.successfulRunsAxis') }}
          </text>
          <text class="text-[10px]" fill="var(--ui-error)" text-anchor="end" y="12" :x="plot.right">
            {{ $t('dashboard.failedRunsAxis') }}
          </text>
        </g>
      </svg>
    </div>
    <div class="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
      <span class="flex items-center gap-2">
        <i class="size-2 rounded-sm bg-success" />
        {{ $t('dashboard.success') }} · {{ formatNumber(totalSuccesses) }}
      </span>
      <span class="flex items-center gap-2">
        <i class="size-2 rounded-full bg-error" />
        {{ $t('dashboard.errors') }} · {{ formatNumber(totalErrors) }}
      </span>
      <span>{{ $t('dashboard.chartScaleHint') }}</span>
    </div>
  </div>
  <p v-else class="py-16 text-center text-sm text-muted">{{ $t('dashboard.noTrendData') }}</p>
</template>

<script setup lang="ts">
import type { WorkflowRunTrendBucket } from '~/types/api/resources';

const props = defineProps<{
  buckets: WorkflowRunTrendBucket[];
  loading: boolean;
}>();

const { locale, t } = useI18n();
const plot = { bottom: 220, left: 48, right: 672, top: 24 } as const;
const plotHeight = plot.bottom - plot.top;
const plotWidth = plot.right - plot.left;

const maximumSuccesses = computed(() => Math.max(1, ...props.buckets.map((bucket) => bucket.successCount)));
const maximumErrors = computed(() => Math.max(1, ...props.buckets.map((bucket) => bucket.errorCount)));
const totalSuccesses = computed(() => props.buckets.reduce((total, bucket) => total + bucket.successCount, 0));
const totalErrors = computed(() => props.buckets.reduce((total, bucket) => total + bucket.errorCount, 0));
const barWidth = computed(() => Math.max(2, Math.min(18, (plotWidth / Math.max(1, props.buckets.length)) * 0.58)));

const chartPoints = computed(() => {
  const denominator = Math.max(1, props.buckets.length - 1);
  return props.buckets.map((bucket, index) => {
    const x = props.buckets.length === 1 ? plot.left + plotWidth / 2 : plot.left + (index / denominator) * plotWidth;
    const successHeight = (bucket.successCount / maximumSuccesses.value) * plotHeight;
    return {
      bucket,
      errorY: plot.bottom - (bucket.errorCount / maximumErrors.value) * plotHeight,
      successHeight,
      successY: plot.bottom - successHeight,
      x,
    };
  });
});

const errorPolyline = computed(() => chartPoints.value.map((point) => `${point.x},${point.errorY}`).join(' '));
const successTicks = computed(() =>
  createTicks(maximumSuccesses.value, (value) => scaleValue(value, maximumSuccesses.value)),
);
const errorTicks = computed(() => createTicks(maximumErrors.value, (value) => scaleValue(value, maximumErrors.value)));
const xLabels = computed(() => {
  const lastIndex = props.buckets.length - 1;
  const indexes = [...new Set([0, Math.floor(lastIndex / 2), lastIndex])];
  return indexes.map((index, labelIndex) => ({
    anchor:
      indexes.length === 1
        ? 'middle'
        : labelIndex === 0
          ? 'start'
          : labelIndex === indexes.length - 1
            ? 'end'
            : 'middle',
    bucketStart: props.buckets[index]!.bucketStart,
    text: formatBucket(props.buckets[index]!.bucketStart),
    x: chartPoints.value[index]!.x,
  }));
});
const chartLabel = computed(() =>
  t('dashboard.trendChartLabel', { errors: totalErrors.value, successes: totalSuccesses.value }),
);

/** Create three readable ticks for one chart scale. */
function createTicks(maximum: number, scale: (value: number) => number): { value: number; y: number }[] {
  const middle = Math.round(maximum / 2);
  return [...new Set([maximum, middle, 0])].map((value) => ({ value, y: scale(value) }));
}

/** Map one value to the shared chart drawing area. */
function scaleValue(value: number, maximum: number): number {
  return plot.bottom - (value / maximum) * plotHeight;
}

/** Format one count using the active interface locale. */
function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale.value).format(value);
}

/** Format one trend bucket with enough detail for the selected granularity. */
function formatBucket(timestamp: string): string {
  const includeTime = props.buckets.length > 32;
  return new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    hour: includeTime ? '2-digit' : undefined,
    hourCycle: 'h23',
    minute: includeTime ? '2-digit' : undefined,
    month: 'short',
  }).format(new Date(timestamp));
}

/** Describe both values for a native SVG point tooltip. */
function bucketTooltip(bucket: WorkflowRunTrendBucket): string {
  return t('dashboard.trendBucketLabel', {
    date: formatBucket(bucket.bucketStart),
    errors: formatNumber(bucket.errorCount),
    successes: formatNumber(bucket.successCount),
  });
}
</script>
