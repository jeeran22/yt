// Central TypeScript contracts — mirror backend controllers exactly.
export type ProductType = "physical" | "digital";
export type Transition = "cut" | "fade" | "dissolve";
export type Resolution = "1024x576" | "576x1024" | "768x768" | "source";
export type StudioMode = "product" | "youtube";

export interface CampaignPresets {
  marketing: {
    productTypes: { id: ProductType; label: string; description: string }[];
    motionSettings: Record<ProductType, { motion_bucket_id: number; cfg_scale: number }>;
    supportedResolutions: string[];
  };
  youtube: {
    niches: string[];
    videoTypes: string[];
    moods: string[] | Record<string, string>;
    motionSettings?: Record<string, { motion_bucket_id: number; cfg_scale: number }>;
    nicheStyles?: Record<string, string>;
  };
}

export interface ModelInfo {
  currentModel: string;
  supportedDimensions: number[];
  supportedFormats: string[];
  maxPromptLength: number;
  video: {
    name: string;
    supportedResolutions: string[];
    parameterRanges: {
      cfgScale: { min: number; max: number; default: number };
      motionBucketId: { min: number; max: number; default: number };
      seed: { min: number; max: number; default: number };
    };
  };
}

export interface ShotOverride {
  id: string;
  // marketing overrides
  mood?: string; surface?: string; lighting?: string;
  atmosphere?: string; accent?: string; style?: string;
  // youtube overrides
  niche?: string; videoType?: string; topic?: string;
  // shared motion overrides (empty string = inherit)
  motion_bucket_id?: number | "";
  cfg_scale?: number | "";
}

export interface CampaignJobState {
  id: string;
  status: "queued" | "processing" | "completed" | "failed" | string;
  shotsDone?: number;
  shotsTotal?: number;
  progress?: number;
  result?: { videoUrl?: string; creativeBrief?: unknown; prompt?: string; seed?: number | string } & Record<string, unknown>;
  error?: { code?: string; message?: string } | string;
  updatedAt?: number;
}

export interface VideoResultState {
  id: string;
  status?: string;
  complete?: boolean;
  completed?: boolean;
  videoUrl?: string;
  [k: string]: unknown;
}

export interface CreativeBriefLike {
  prompt?: string;
  seed?: number | string;
  notes?: string | string[];
  motion_bucket_id?: number;
  cfg_scale?: number;
  [k: string]: unknown;
}

export interface ApiErrorShape {
  code: string;
  status: number;
  message: string;
  details?: unknown;
}
