import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, throwError } from 'rxjs';
import { catchError, map, tap, filter } from 'rxjs/operators';
import * as THREE from 'three';
import { StoryBlock, StoryManifest } from '../models/story.model';

export enum StoryState {
  IDLE = 'IDLE',
  PLAY_AUDIO = 'PLAY_AUDIO',
  PLAY_ANIM = 'PLAY_ANIM',
  WAIT_FOR_INTERACTION = 'WAIT_FOR_INTERACTION',
  REWARD = 'REWARD',
  FAIL = 'FAIL',
  NEXT = 'NEXT',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

@Injectable({
  providedIn: 'root',
})
export class StoryDirectorService {
  // -- State Management --
  private _currentState = new BehaviorSubject<StoryState>(StoryState.IDLE);
  public readonly currentState$ = this._currentState.asObservable();

  private _currentBlockIndex = new BehaviorSubject<number>(-1);
  public readonly currentBlockIndex$ = this._currentBlockIndex.asObservable();

  private _currentManifest = new BehaviorSubject<StoryManifest | null>(null);
  public readonly currentManifest$ = this._currentManifest.asObservable();

  private _currentBlock = new BehaviorSubject<StoryBlock | null>(null);
  public readonly currentBlock$ = this._currentBlock.asObservable();

  // -- Audio & Animation Sync --
  private _audioPlayer: HTMLAudioElement = new Audio();
  private _renderMixer: THREE.AnimationMixer | null = null;
  private _currentAction: THREE.AnimationAction | null = null;
  private _animations: THREE.AnimationClip[] = [];

  // -- Event Streams --
  private _interactionRequired = new Subject<StoryBlock>();
  public readonly interactionRequired$ =
    this._interactionRequired.asObservable();

  constructor(private http: HttpClient) {
    this._initAudioListeners();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Loads a Story Manifest from a JSON URL.
   */
  public loadStory(manifestUrl: string): Observable<StoryManifest> {
    console.log(`[Director] Loading Manifest: ${manifestUrl}`);
    this._resetState();

    return this.http.get<StoryManifest>(manifestUrl).pipe(
      tap((manifest) => {
        if (!manifest || !manifest.blocks || manifest.blocks.length === 0) {
          throw new Error('Invalid Story Manifest: No blocks found.');
        }
        this._currentManifest.next(manifest);
        console.log(
          `[Director] Manifest '${manifest.title}' loaded with ${manifest.blocks.length} blocks.`
        );
      }),
      catchError((err) => {
        console.error('[Director] Failed to load manifest', err);
        return throwError(() => new Error('Failed to load story manifest.'));
      })
    );
  }

  /**
   * Connects the Three.js Animation Mixer to the Director.
   * This is called by the 3D Component when the model is loaded.
   */
  public registerAnimator(
    mixer: THREE.AnimationMixer,
    animations: THREE.AnimationClip[]
  ) {
    this._renderMixer = mixer;
    this._animations = animations;
    console.log(
      `[Director] Animator registered with ${animations.length} clips.`
    );
  }

  /**
   * Starts the story from the beginning.
   */
  public play() {
    if (!this._currentManifest.value) {
      console.error('[Director] No manifest loaded. Cannot play.');
      return;
    }
    console.log('[Director] Starting Story...');
    this._currentBlockIndex.next(0);
    this._processBlock(0);
  }

  /**
   * Must be called when the user successfully performs the required interaction.
   */
  public handleInteractionSuccess() {
    if (this._currentState.value !== StoryState.WAIT_FOR_INTERACTION) {
      console.warn(
        '[Director] Interaction ignored - not in WAIT_FOR_INTERACTION state.'
      );
      return;
    }
    console.log('[Director] Interaction Success!');
    this._transitionTo(StoryState.REWARD);
  }

  /**
   * Must be called when the user fails the interaction (e.g. timeout).
   */
  public handleInteractionFail() {
    if (this._currentState.value !== StoryState.WAIT_FOR_INTERACTION) {
      return;
    }
    console.log('[Director] Interaction Failed.');
    this._transitionTo(StoryState.FAIL);
  }

  public cleanup() {
    this._stopAudio();
    this._stopAnimation();
    this._resetState();
  }

  // ============================================
  // INTERNAL STATE MACHINE
  // ============================================

  private _processBlock(index: number) {
    const manifest = this._currentManifest.value;
    if (!manifest || index >= manifest.blocks.length) {
      this._transitionTo(StoryState.COMPLETED);
      return;
    }

    const block = manifest.blocks[index];
    this._currentBlock.next(block);
    console.log(
      `[Director] Processing Block ${index}: [${block.type}] ${block.subtitle_text}`
    );

    // Start Sequence
    this._startAudio(block.audio_url);
    this._startAnimation(block.anim_name, block.loop_anim);

    if (block.type === 'NARRATION') {
      this._transitionTo(StoryState.PLAY_AUDIO);
      // Wait for audio end to proceed
    } else if (block.type === 'INTERACTION') {
      this._transitionTo(StoryState.PLAY_AUDIO); // Still play audio first
      // After audio ends, we will transition to WAIT_FOR_INTERACTION
    }
  }

  private _transitionTo(newState: StoryState) {
    console.log(
      `[Director] State Transition: ${this._currentState.value} -> ${newState}`
    );
    this._currentState.next(newState);

    switch (newState) {
      case StoryState.NEXT:
        const nextIndex = this._currentBlockIndex.value + 1;
        this._currentBlockIndex.next(nextIndex);
        this._processBlock(nextIndex);
        break;

      case StoryState.WAIT_FOR_INTERACTION:
        // Set up timeouts or listeners if needed
        const block = this._currentBlock.value;
        if (block && block.interaction) {
          this._interactionRequired.next(block);
          // NOTE: Timeout logic could be handled here or in the UI component consuming interactionRequired$
        } else {
          console.error(
            '[Director] Interaction state reached but no interaction data in block.'
          );
          this._transitionTo(StoryState.NEXT); // Fallback
        }
        break;

      case StoryState.REWARD:
        // Play reward sound/anim if exists, then go NEXT
        // For now, fast forward to NEXT
        setTimeout(() => this._transitionTo(StoryState.NEXT), 1000);
        break;

      case StoryState.FAIL:
        // Handle Fail (retry or skip?)
        // For now, simple retry logic or just move on.
        // Veldora demands retention -> Maybe replay instructions?
        // Let's restart the current block info for now.
        console.warn(
          '[Director] Interaction fail - Replaying block instructions.'
        );
        const idx = this._currentBlockIndex.value;
        this._processBlock(idx);
        break;

      case StoryState.COMPLETED:
        console.log('[Director] Story Completed.');
        break;
    }
  }

  // ============================================
  // AUDIO ENGINE
  // ============================================

  private _initAudioListeners() {
    this._audioPlayer.onended = () => {
      console.log('[Director] Audio Ended.');
      this._handleAudioComplete();
    };

    this._audioPlayer.onerror = (e) => {
      console.error('[Director] Audio Error:', e);
      // Safety net: Advance even if audio breaks to avoid soft-lock
      this._transitionTo(StoryState.ERROR);
    };
  }

  private _startAudio(url: string) {
    if (!url) return;
    this._audioPlayer.src = url;
    this._audioPlayer.load();
    this._audioPlayer
      .play()
      .catch((e) => console.error('[Director] Play failed', e));
  }

  private _stopAudio() {
    this._audioPlayer.pause();
    this._audioPlayer.currentTime = 0;
  }

  private _handleAudioComplete() {
    const block = this._currentBlock.value;
    if (!block) return;

    if (block.type === 'NARRATION') {
      // Narration done, move next
      this._transitionTo(StoryState.NEXT);
    } else if (block.type === 'INTERACTION') {
      // Narration instructions done, user turn
      this._transitionTo(StoryState.WAIT_FOR_INTERACTION);
      // Important: Maybe we want to loop component's idle animation now?
      // Or keep the current one looping?
    }
  }

  // ============================================
  // ANIMATION ENGINE
  // ============================================

  private _startAnimation(animName: string, shouldLoop: boolean = true) {
    if (!this._renderMixer || !animName) return;

    const clip = this._animations.find((a) => a.name === animName);
    if (!clip) {
      console.warn(`[Director] Animation clip '${animName}' not found!`);
      return;
    }

    // Fade out old action if exists
    const prevAction = this._currentAction;

    // Play new action
    const newAction = this._renderMixer.clipAction(clip);
    newAction.reset();
    newAction.setLoop(
      shouldLoop ? THREE.LoopRepeat : THREE.LoopOnce,
      shouldLoop ? Infinity : 1
    );
    newAction.clampWhenFinished = !shouldLoop;
    newAction.play();

    if (prevAction && prevAction !== newAction) {
      newAction.crossFadeFrom(prevAction, 0.5, true);
    }

    this._currentAction = newAction;
  }

  private _stopAnimation() {
    if (this._currentAction) {
      this._currentAction.stop();
      this._currentAction = null;
    }
  }
  private _resetState() {
    this._currentState.next(StoryState.IDLE);
    this._currentBlockIndex.next(-1);
    this._currentBlock.next(null);
    this._currentAction = null;
    // _currentManifest is typically not reset unless loading a new one,
    // but the loadStory method handles that.
    // _renderMixer and _animations are persistent for the session usually.
  }
}
