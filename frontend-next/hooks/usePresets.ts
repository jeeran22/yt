"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { CampaignPresets, ModelInfo } from "@/lib/types";

const FALLBACK_PRESETS: CampaignPresets = {
  marketing: {
    productTypes: [
      { id: "physical", label: "Physical Product", description: "Electronics, fashion, beauty, home, food" },
      { id: "digital", label: "Digital Product / SaaS", description: "Apps, software, courses, e-books" },
    ],
    motionSettings: {
      physical: { motion_bucket_id: 75, cfg_scale: 2.0 },
      digital: { motion_bucket_id: 120, cfg_scale: 1.6 },
    },
    supportedResolutions: ["1024x576", "576x1024", "768x768"],
  },
  youtube: {
    niches: ["tech", "gaming", "cooking", "fitness", "travel", "finance", "education", "lifestyle", "music", "beauty"],
    videoTypes: ["intro", "b_roll", "background_loop", "outro", "character_anim"],
    moods: ["energetic", "calm", "premium", "dark"],
  },
};

const FALLBACK_MODELS: ModelInfo = {
  currentModel: "Stable Diffusion 3 Turbo",
  supportedDimensions: [512, 768, 1024],
  supportedFormats: ["png", "jpeg", "webp"],
  maxPromptLength: 10000,
  video: {
    name: "Stable Video Diffusion",
    supportedResolutions: ["1024x576", "576x1024", "768x768"],
    parameterRanges: {
      cfgScale: { min: 0, max: 10, default: 1.8 },
      motionBucketId: { min: 1, max: 255, default: 127 },
      seed: { min: 0, max: 4294967294, default: 0 },
    },
  },
};

export function usePresets() {
  const campaigns = useQuery({
    queryKey: ["campaigns"],
    queryFn: api.getCampaigns,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const models = useQuery({
    queryKey: ["models"],
    queryFn: api.getModels,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  let presets: CampaignPresets = FALLBACK_PRESETS;
  if (campaigns.data?.marketing && campaigns.data?.youtube) {
    const moods: unknown = (campaigns.data.youtube as { moods: unknown }).moods;
    presets = {
      ...campaigns.data,
      youtube: { ...campaigns.data.youtube, moods: (Array.isArray(moods) ? moods : Object.keys((moods as object) || {})) as string[] },
    };
  }
  return { presets, models: (models.data as ModelInfo) || FALLBACK_MODELS, campaignsLoading: campaigns.isLoading, modelsLoading: models.isLoading };
}

export function moodsList(moods: string[] | Record<string, string> | undefined): string[] {
  if (!moods) return ["energetic", "calm", "premium", "dark"];
  return Array.isArray(moods) ? moods : Object.keys(moods);
}
