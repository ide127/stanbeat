const { createApplixirPlaybackState, applyApplixirStatus } = await import('../services/providers/applixirEvents.ts');

function run(events) {
  const state = createApplixirPlaybackState();
  let decision = 'continue';
  for (const type of events) {
    decision = applyApplixirStatus(state, { type });
  }
  return decision;
}

const cases = [
  {
    name: 'complete event directly grants completion',
    events: ['loaded', 'start', 'complete'],
    expected: 'completed',
  },
  {
    name: 'IMA flow without complete is completion after playback progress and allAdsCompleted',
    events: ['loaded', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'allAdsCompleted'],
    expected: 'completed',
  },
  {
    name: 'bare allAdsCompleted is no fill',
    events: ['allAdsCompleted'],
    expected: 'noAds',
  },
  {
    name: 'loaded without playback progress is not rewarded on allAdsCompleted',
    events: ['loaded', 'allAdsCompleted'],
    expected: 'continue',
  },
  {
    name: 'skipped stays skipped',
    events: ['loaded', 'start', 'skipped'],
    expected: 'skipped',
  },
];

const failures = [];
for (const testCase of cases) {
  const actual = run(testCase.events);
  if (actual !== testCase.expected) {
    failures.push(`${testCase.name}: expected ${testCase.expected}, got ${actual}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('applixir-events-ok');
