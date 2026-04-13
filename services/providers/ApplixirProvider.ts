declare global {
    interface Window {
        Application?: new (options: ApplixirOptions) => ApplixirApplication;
        initializeAndOpenPlayer?: (options: ApplixirOptions) => void;
    }
}
import { runtimeConfig } from '../../runtimeConfig';
import { getStanbeatTestApi } from '../../devTestApi';
import { applyApplixirStatus, createApplixirPlaybackState } from './applixirEvents';

interface ApplixirErrorDetails {
    type?: string;
    errorCode?: number;
    errorMessage?: string;
    innerError?: string;
}

interface ApplixirError {
    getError?: () => {
        data?: ApplixirErrorDetails;
    };
}

interface ApplixirApplication {
    initialize: () => Promise<void> | void;
    openPlayer: () => Promise<void> | void;
}

interface ApplixirStatusPayload {
    type?: string;
}

interface ApplixirOptions {
    apiKey: string;
    injectionElementId: string;
    adStatusCallbackFn?: (status: ApplixirStatusPayload | string) => void;
    adErrorCallbackFn?: (error: ApplixirError) => void;
    isThankYouModalDisabled?: boolean;
    userId?: string;
}

type RewardedVideoResult = 'completed' | 'skipped' | 'error' | 'noAds' | 'configMissing' | 'invalidConfig';
interface RewardedVideoCallbacks {
    onPlaybackStarted?: () => void;
}

const APPLIXIR_CONTAINER_ID = 'applixir_vanishing_div';
const APPLIXIR_SCRIPT_SRC = runtimeConfig.applixir.scriptSrc;
const APPLIXIR_VAST_ENDPOINT = 'https://api.applixir.com/api/v1/games/vast';

const NO_FILL_ERROR_TYPES = new Set([
    'failedToRequestAds',
    'vastEmptyResponse',
    'vastNoAdsAfterWrapper',
    'vastLoadTimeout',
    'vastMediaLoadTimeout',
    'vastAssetNotFound',
    'adsRequestNetworkError',
]);

const PROGRESS_STATUSES = new Set(['loaded', 'start', 'started', 'firstquartile', 'midpoint', 'thirdquartile', 'paused', 'click']);
const PLAYBACK_STARTED_STATUSES = new Set(['start', 'started', 'firstquartile', 'midpoint', 'thirdquartile']);
const INITIAL_PLAYER_TIMEOUT_MS = 30000;
const ACTIVE_PLAYER_TIMEOUT_MS = 45000;

const normalizeStatusType = (status: ApplixirStatusPayload | string | null | undefined): string => {
    const raw = typeof status === 'string' ? status : status?.type;
    return String(raw ?? '').replace(/[^a-z]/gi, '').toLowerCase();
};

const getErrorDetails = (error: ApplixirError | null | undefined): ApplixirErrorDetails => {
    try {
        return error?.getError?.().data ?? {};
    } catch {
        return {};
    }
};

export class ApplixirProvider {
    readonly name = 'Applixir';

    private sdkReadyPromise: Promise<void> | null = null;
    private resolvedApiKey: string | null = runtimeConfig.applixir.apiKey || null;
    private validationState: { apiKey: string; promise: Promise<'ok' | 'invalid' | 'unknown'> } | null = null;

    preload(): Promise<void> {
        if (!runtimeConfig.capabilities.rewardedVideo) {
            return Promise.resolve();
        }

        return Promise.all([
            this.ensureSdkReady(),
            this.resolveApiKey(),
        ]).then(() => undefined).catch((error) => {
            console.error('[ApplixirProvider] Preload failed:', error);
        });
    }

    async showRewardedVideo(userId: string, callbacks: RewardedVideoCallbacks = {}): Promise<RewardedVideoResult> {
        const override = getStanbeatTestApi()?.rewardedVideo?.showRewardedVideo;
        if (override) {
            return await override(userId, callbacks);
        }

        if (!runtimeConfig.capabilities.rewardedVideo) {
            return 'configMissing';
        }

        const container = this.getContainer();
        if (!container) {
            console.error('[ApplixirProvider] Missing Applixir container.');
            return 'error';
        }

        await this.preload();
        const apiKey = await this.resolveApiKey();
        if (!apiKey) {
            console.error('[ApplixirProvider] Missing AppLixir API key.');
            return 'configMissing';
        }

        const validation = await this.validateApiKey(apiKey);
        if (validation === 'invalid') {
            console.error('[ApplixirProvider] The configured AppLixir API key returned 404 from the VAST endpoint.');
            return 'invalidConfig';
        }

        const openPlayerDirectly = typeof window.initializeAndOpenPlayer === 'function';
        const ApplicationCtor = window.Application;
        if (!openPlayerDirectly && typeof ApplicationCtor !== 'function') {
            console.error('[ApplixirProvider] No AppLixir player entrypoint is available.');
            return 'error';
        }

        container.style.display = 'block';
        container.style.pointerEvents = 'auto';

        return new Promise<RewardedVideoResult>((resolve) => {
            let settled = false;
            const playbackState = createApplixirPlaybackState();
            let timeout = 0;
            let playbackStartedNotified = false;

            const armTimeout = (delayMs: number) => {
                window.clearTimeout(timeout);
                timeout = window.setTimeout(() => {
                    console.error('[ApplixirProvider] Timed out while waiting for AppLixir completion events.');
                    finish('error');
                }, delayMs);
            };

            const finish = (result: RewardedVideoResult) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeout);
                container.style.display = 'none';
                container.style.pointerEvents = 'none';
                resolve(result);
            };

            armTimeout(INITIAL_PLAYER_TIMEOUT_MS);

            const options: ApplixirOptions = {
                apiKey,
                injectionElementId: APPLIXIR_CONTAINER_ID,
                userId,
                isThankYouModalDisabled: true,
                adStatusCallbackFn: (status) => {
                    const statusType = normalizeStatusType(status);
                    console.log('[ApplixirProvider] Ad status:', status);

                    if (PROGRESS_STATUSES.has(statusType)) {
                        armTimeout(ACTIVE_PLAYER_TIMEOUT_MS);
                    }
                    if (!playbackStartedNotified && PLAYBACK_STARTED_STATUSES.has(statusType)) {
                        playbackStartedNotified = true;
                        callbacks.onPlaybackStarted?.();
                    }

                    const decision = applyApplixirStatus(playbackState, status);
                    if (decision === 'completed') finish('completed');
                    else if (decision === 'noAds') finish('noAds');
                    else if (decision === 'skipped') finish('skipped');
                    else if (decision === 'error') finish('error');
                },
                adErrorCallbackFn: (error) => {
                    const details = getErrorDetails(error);
                    console.error('[ApplixirProvider] Ad error:', details);
                    finish(NO_FILL_ERROR_TYPES.has(String(details.type ?? '')) ? 'noAds' : 'error');
                },
            };

            try {
                if (openPlayerDirectly) {
                    window.initializeAndOpenPlayer!(options);
                    return;
                }

                const app = new ApplicationCtor!(options);
                Promise.resolve(app.initialize())
                    .then(() => Promise.resolve(app.openPlayer()))
                    .catch((error) => {
                        console.error('[ApplixirProvider] Failed to open player:', error);
                        finish('error');
                    });
            } catch (error) {
                console.error('[ApplixirProvider] Failed to open player:', error);
                finish('error');
            }
        });
    }

    private async ensureSdkReady(): Promise<void> {
        if (!this.sdkReadyPromise) {
            this.sdkReadyPromise = (async () => {
                await this.ensureWindowLoaded();
                await this.ensureSdkLoaded();
                if (typeof window.Application !== 'function' && typeof window.initializeAndOpenPlayer !== 'function') {
                    throw new Error('Applixir player entrypoints are not available.');
                }
            })();
        }

        try {
            await this.sdkReadyPromise;
        } catch (error) {
            this.sdkReadyPromise = null;
            console.error('[ApplixirProvider] Initialization failed:', error);
            throw error;
        }
    }

    private getContainer(): HTMLElement | null {
        return document.getElementById(APPLIXIR_CONTAINER_ID);
    }

    private ensureWindowLoaded(): Promise<void> {
        if (document.readyState === 'complete') {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            window.addEventListener('load', () => resolve(), { once: true });
        });
    }

    private ensureSdkLoaded(): Promise<void> {
        if (typeof window.Application === 'function') {
            return Promise.resolve();
        }

        const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${APPLIXIR_SCRIPT_SRC}"]`);
        if (existingScript) {
            return new Promise((resolve, reject) => {
                if (typeof window.Application === 'function') {
                    resolve();
                    return;
                }
                existingScript.addEventListener('load', () => resolve(), { once: true });
                existingScript.addEventListener('error', () => reject(new Error('Failed to load Applixir SDK')), { once: true });
            });
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = APPLIXIR_SCRIPT_SRC;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Applixir SDK'));
            document.head.appendChild(script);
        });
    }

    private async resolveApiKey(): Promise<string | null> {
        if (this.resolvedApiKey) return this.resolvedApiKey;
        return null;
    }

    private async validateApiKey(apiKey: string): Promise<'ok' | 'invalid' | 'unknown'> {
        if (this.validationState?.apiKey === apiKey) {
            return this.validationState.promise;
        }

        const validationPromise = (async () => {
            try {
                const response = await fetch(`${APPLIXIR_VAST_ENDPOINT}/${encodeURIComponent(apiKey)}`, {
                    method: 'GET',
                    credentials: 'omit',
                    cache: 'no-store',
                });

                if (response.status === 404) {
                    return 'invalid';
                }

                return response.ok ? 'ok' : 'unknown';
            } catch (error) {
                console.warn('[ApplixirProvider] Failed to validate AppLixir API key before opening the player:', error);
                return 'unknown';
            }
        })();

        this.validationState = { apiKey, promise: validationPromise };
        return validationPromise;
    }
}

export const applixirProvider = new ApplixirProvider();

if (typeof window !== 'undefined') {
    void applixirProvider.preload();
}
