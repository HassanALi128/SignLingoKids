import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

/**
 * StorageService
 *
 * A thin, strictly-typed wrapper around @capacitor/preferences.
 * Prefer this over browser `localStorage` so that values survive
 * WebView resets and are native-storage backed on iOS / Android.
 *
 * Add new typed accessors here (get/set pairs) as the app grows.
 */
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  // ─── Private Keys ─────────────────────────────────────────────────────────

  private static readonly KEYS = {
    HAS_SEEN_ONBOARDING: 'app.hasSeenOnboarding',
    LAST_PAYWALL_SHOWN: 'app.lastPaywallShownTs',
  } as const;

  // ─── Onboarding ───────────────────────────────────────────────────────────

  /** Mark that the user has completed onboarding on this device. */
  async setHasSeenOnboarding(): Promise<void> {
    await this.set(StorageService.KEYS.HAS_SEEN_ONBOARDING, 'true');
  }

  /**
   * Returns `true` if the user has already seen the onboarding flow,
   * `false` if this is a first launch (or after app data was cleared).
   */
  async getHasSeenOnboarding(): Promise<boolean> {
    const value = await this.get(StorageService.KEYS.HAS_SEEN_ONBOARDING);
    return value === 'true';
  }

  async clearHasSeenOnboarding(): Promise<void> {
    await this.remove(StorageService.KEYS.HAS_SEEN_ONBOARDING);
  }

  // ─── Paywall Throttle ─────────────────────────────────────────────────────

  /**
   * Store the timestamp (ms since epoch) at which the paywall was last shown.
   * Used to avoid showing it more than once per 24 h.
   */
  async setLastPaywallShown(timestamp: number): Promise<void> {
    await this.set(StorageService.KEYS.LAST_PAYWALL_SHOWN, String(timestamp));
  }

  /**
   * Returns the timestamp of the last paywall display, or `0` if it has
   * never been shown (which forces an immediate show).
   */
  async getLastPaywallShown(): Promise<number> {
    const value = await this.get(StorageService.KEYS.LAST_PAYWALL_SHOWN);
    return value ? parseInt(value, 10) : 0;
  }

  // ─── Generic Helpers (private) ────────────────────────────────────────────

  private async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  private async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }

  private async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}
