// ---------------------------------------------------------------------------
// Presets cache: GET /models + GET /campaigns fetched lazily (once) and
// mirrored with backend defaults so the UI works even if the backend is down.
// ---------------------------------------------------------------------------

import api from '../api/client.js';

// Mirrors src/config/stabilityConfig.js
const MODEL_DEFAULTS = {
  currentModel: 'Stable Diffusion 3 Turbo',
  supportedDimensions: [512, 768, 1024],
  supportedFormats: ['png', 'jpeg', 'webp'],
  maxPromptLength: 10000,
  maxDimensions: 1024,
  video: {
    name: 'Stable Video Diffusion',
    type: 'Image-to-Video',
    supportedResolutions: ['1024x576', '576x1024', '768x768'],
    supportedFormats: ['mp4'],
    maxDurationSeconds: 2,
    fps: 24,
    watermarked: true,
    parameterRanges: {
      cfgScale: { min: 0, max: 10, default: 1.8 },
      motionBucketId: { min: 1, max: 255, default: 127 },
      seed: { min: 0, max: 4294967294, default: 0 }
    }
  }
};

// Mirrors src/config/campaignsConfig.js
const CAMPAIGN_DEFAULTS = {
  marketing: {
    productTypes: [
      { id: 'physical', label: 'Physical Product', description: 'Physical goods — electronics, fashion, beauty, home, food, etc.' },
      { id: 'digital', label: 'Digital Product / SaaS', description: 'Apps, software, digital services, online courses, e-books' }
    ],
    motionSettings: {
      physical: { motion_bucket_id: 75, cfg_scale: 2.0 },
      digital: { motion_bucket_id: 120, cfg_scale: 1.6 }
    },
    supportedResolutions: MODEL_DEFAULTS.video.supportedResolutions
  },
  youtube: {
    niches: ['tech', 'gaming', 'cooking', 'fitness', 'travel', 'finance', 'education', 'lifestyle', 'music', 'beauty'],
    videoTypes: ['intro', 'b_roll', 'background_loop', 'outro', 'character_anim'],
    moods: ['energetic', 'calm', 'premium', 'dark']
  }
};

let models = null;
let campaigns = null;
let loadPromise = null;

export function getModelsCached() {
  return models || MODEL_DEFAULTS;
}

export function getCampaignsCached() {
  return campaigns || CAMPAIGN_DEFAULTS;
}

export async function ensurePresets() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([loadModels(), loadCampaigns()]);
  return loadPromise;
}

async function loadModels() {
  try {
    const data = await api.getModels();
    if (data && data.video && data.supportedDimensions) {
      models = data;
      return data;
    }
  } catch (e) {
    // backend down — fall back to defaults
  }
  models = MODEL_DEFAULTS;
  return models;
}

async function loadCampaigns() {
  try {
    const data = await api.getCampaigns();
    if (data && data.marketing && data.youtube) {
      campaigns = data;
      // Normalise: moods may arrive as an object from old backends.
      const moods = data.youtube.moods;
      if (moods && !Array.isArray(moods)) {
        campaigns.youtube.moods = Object.keys(moods);
      }
      return campaigns;
    }
  } catch (e) {
    // backend down — fall back to defaults
  }
  campaigns = CAMPAIGN_DEFAULTS;
  return campaigns;
}

export function modelVideo() {
  return getModelsCached().video || MODEL_DEFAULTS.video;
}

export function videoResolutions() {
  return modelVideo().supportedResolutions || MODEL_DEFAULTS.video.supportedResolutions;
}

export function cfgRange() {
  const p = modelVideo().parameterRanges || MODEL_DEFAULTS.video.parameterRanges;
  return p.cfgScale;
}

export function motionRange() {
  const p = modelVideo().parameterRanges || MODEL_DEFAULTS.video.parameterRanges;
  return p.motionBucketId;
}

export function seedRange() {
  const p = modelVideo().parameterRanges || MODEL_DEFAULTS.video.parameterRanges;
  return p.seed;
}