export type StoryBlockType = 'NARRATION' | 'INTERACTION';

export interface StoryInteraction {
  target_mesh: string;
  timeout: number;
}

export interface StoryBlock {
  id: number;
  type: StoryBlockType;
  audio_url: string;
  subtitle_text: string;
  anim_name: string;
  interaction?: StoryInteraction;
  /**
   * If true, the animation will loop. If false or undefined, it plays once.
   * Default is handled by the Director (usually loops for idle, plays once for action).
   */
  loop_anim?: boolean;
}

export interface StoryManifest {
  id: string;
  title: string;
  version: number;
  assets: {
    glb_url: string;
    preload_audio?: string[];
  };
  blocks: StoryBlock[];
}
