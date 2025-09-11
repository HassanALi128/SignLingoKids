import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export interface AslSign {
  id: string;
  label: string;
  description?: string;
  thumbUrl?: string;
  pose?: Record<string, { x: number; y: number; z: number }>;
}

interface State {
  signs: AslSign[];
  selectedSign?: AslSign;
  isPlaying: boolean;
  loading: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class AslSignStore {
  private state$ = new BehaviorSubject<State>({
    signs: [],
    isPlaying: false,
    loading: false
  });

  vm$ = this.state$.pipe(map(s => s));

  get snapshot(): State {
    return this.state$.value;
  }

  setSigns(signs: AslSign[]) {
    this.update({ signs });
  }

  selectSign(sign: AslSign) {
    this.update({ selectedSign: sign });
  }

  setPlaying(isPlaying: boolean) {
    this.update({ isPlaying });
  }

  setLoading(loading: boolean) {
    this.update({ loading });
  }

  setError(error: string) {
    this.update({ error });
  }

  private update(newState: Partial<State>) {
    this.state$.next({ ...this.snapshot, ...newState });
  }
}
