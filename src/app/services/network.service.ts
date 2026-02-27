import { Injectable, OnDestroy } from '@angular/core';
import { Network } from '@capacitor/network';
import { PluginListenerHandle } from '@capacitor/core';
import { BehaviorSubject } from 'rxjs';

/**
 * NetworkService
 *
 * Listens to native network status changes via the @capacitor/network plugin
 * and exposes a reactive BehaviorSubject<boolean> `isOnline$`.
 *
 * Usage:
 *  inject NetworkService and subscribe to `isOnline$` or use it in templates
 *  via the `async` pipe.
 *
 * Memory safety:
 *  The Capacitor listener handle is removed in `ngOnDestroy`. Since this
 *  service is provided in 'root' it lives for the lifetime of the app, but
 *  the cleanup is still important for unit-test isolation.
 */
@Injectable({
  providedIn: 'root',
})
export class NetworkService implements OnDestroy {
  /** Emits `true` when the device is online, `false` when offline. */
  readonly isOnline$ = new BehaviorSubject<boolean>(true);

  private listenerHandle?: PluginListenerHandle;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    // Seed the subject with the current status immediately so the first
    // subscriber never sees a stale `true` default on a genuinely offline device.
    try {
      const status = await Network.getStatus();
      this.isOnline$.next(status.connected);
    } catch {
      // If the plugin fails (e.g. in browser preview), default to online.
      this.isOnline$.next(true);
    }

    // Register the ongoing listener.
    this.listenerHandle = await Network.addListener(
      'networkStatusChange',
      (status) => {
        this.isOnline$.next(status.connected);
      }
    );
  }

  /** Current synchronous snapshot. Prefer `isOnline$` for reactive code. */
  get isOnline(): boolean {
    return this.isOnline$.getValue();
  }

  ngOnDestroy(): void {
    this.listenerHandle?.remove();
    this.isOnline$.complete();
  }
}
