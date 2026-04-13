export type ApplixirPlaybackState = {
  sawLoaded: boolean;
  sawStarted: boolean;
  sawPlaybackProgress: boolean;
  sawCompleted: boolean;
};

export type ApplixirEventDecision = 'continue' | 'completed' | 'skipped' | 'error' | 'noAds';

const COMPLETED_STATUSES = new Set(['complete']);
const COMPLETION_WRAPUP_STATUSES = new Set(['alladscompleted', 'thankyoumodalclosed']);
const SKIPPED_STATUSES = new Set(['skipped', 'manuallyended']);
const ERROR_STATUSES = new Set(['consentdeclined']);
const PROGRESS_STATUSES = new Set(['loaded', 'start', 'started', 'firstquartile', 'midpoint', 'thirdquartile', 'paused', 'click']);
const PLAYBACK_PROGRESS_STATUSES = new Set(['start', 'started', 'firstquartile', 'midpoint', 'thirdquartile']);

export const createApplixirPlaybackState = (): ApplixirPlaybackState => ({
  sawLoaded: false,
  sawStarted: false,
  sawPlaybackProgress: false,
  sawCompleted: false,
});

export const normalizeApplixirStatusType = (status: { type?: string } | string | null | undefined): string => {
  const raw = typeof status === 'string' ? status : status?.type;
  return String(raw ?? '').replace(/[^a-z]/gi, '').toLowerCase();
};

export const applyApplixirStatus = (
  state: ApplixirPlaybackState,
  status: { type?: string } | string | null | undefined,
): ApplixirEventDecision => {
  const statusType = normalizeApplixirStatusType(status);

  if (PROGRESS_STATUSES.has(statusType)) {
    if (statusType === 'loaded') state.sawLoaded = true;
    if (statusType === 'start' || statusType === 'started') state.sawStarted = true;
    if (PLAYBACK_PROGRESS_STATUSES.has(statusType)) state.sawPlaybackProgress = true;
  }

  if (statusType === 'loaded' || statusType === 'start' || statusType === 'started') {
    return 'continue';
  }

  if (COMPLETED_STATUSES.has(statusType)) {
    state.sawCompleted = true;
    return 'completed';
  }

  if (COMPLETION_WRAPUP_STATUSES.has(statusType)) {
    if (state.sawCompleted || state.sawStarted || state.sawPlaybackProgress) {
      return 'completed';
    }
    if (!state.sawLoaded && !state.sawStarted) {
      return 'noAds';
    }
    return 'continue';
  }

  if (SKIPPED_STATUSES.has(statusType)) return 'skipped';
  if (ERROR_STATUSES.has(statusType)) return 'error';
  return 'continue';
};
