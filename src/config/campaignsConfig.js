/**
 * Use-case driven campaign presets.
 *
 * These power the /campaigns/* endpoints so marketing teams and YouTubers
 * can generate tailored, on-brand videos without writing prompt engineering.
 */

const CAMPAIGNS_CONFIG = {
  MARKETING: {
    productTypes: [
      {
        id: 'physical',
        label: 'Physical Product',
        description: 'Physical goods - electronics, fashion, beauty, home, food, etc.'
      },
      {
        id: 'digital',
        label: 'Digital Product / SaaS',
        description: 'Apps, software, digital services, online courses, e-books'
      }
    ],
    // Tuned motion settings per product type
    motion: {
      physical: { motion_bucket_id: 75, cfg_scale: 2.0 },
      digital: { motion_bucket_id: 120, cfg_scale: 1.6 }
    },
    promptTemplates: {
      physical: [
        'Cinematic {mood} product advertisement of {product}, {description}.',
        'The product rotates slowly on a {surface} with {lighting}.',
        '{atmosphere}',
        '{style}, ultra detailed commercial product photography, shallow depth of field, premium studio quality'
      ].join(' '),
      digital: [
        'Futuristic holographic product reveal of {product}, {description}.',
        'Floating 3D interface panels orbit in dark space with {accent} neon accents.',
        '{atmosphere}',
        '{style}, clean premium tech advertisement aesthetic, ultra sharp, high contrast'
      ].join(' ')
    }
  },

  YOUTUBE: {
    niches: [
      'tech', 'gaming', 'cooking', 'fitness', 'travel',
      'finance', 'education', 'lifestyle', 'music', 'beauty'
    ],
    videoTypes: ['intro', 'b_roll', 'background_loop', 'outro', 'character_anim'],
    moods: {
      energetic: 'energetic, fast-moving, vibrant',
      calm: 'calm, smooth, relaxing',
      premium: 'premium, polished, minimal',
      dark: 'moody, mysterious, dramatic'
    },
    nicheStyles: {
      tech: 'glowing circuit patterns, holographic UI elements, neon blue accents',
      gaming: 'dark arena with neon lights, particle bursts, dynamic energy waves',
      cooking: 'warm rustic kitchen, gentle steam wisps, fresh ingredients, soft golden lighting',
      fitness: 'high-energy gym atmosphere, dramatic backlight, dust particles in motion',
      travel: 'golden hour landscapes, drifting clouds, wanderlust atmosphere',
      finance: 'clean minimalist charts, floating coins and graphs, professional blue tones',
      education: 'bright study desk, orbiting books and symbols, focused warm light',
      lifestyle: 'cozy aesthetic room, soft bokeh lights, relaxed peaceful vibe',
      music: 'pulsing sound waves, stage lights, rhythmic visualizer bars',
      beauty: 'soft studio glow, glowing skincare droplets, elegant pastel tones'
    },
    // Recommended motion per video type
    motion: {
      intro: { motion_bucket_id: 150, cfg_scale: 1.6 },
      b_roll: { motion_bucket_id: 100, cfg_scale: 1.8 },
      background_loop: { motion_bucket_id: 60, cfg_scale: 2.2 },
      outro: { motion_bucket_id: 80, cfg_scale: 2.0 },
      character_anim: { motion_bucket_id: 180, cfg_scale: 1.4 }
    },
    videoTypeTemplates: {
      intro: [
        'Dynamic {mood} YouTube intro animation for a {niche} channel about {topic}.',
        '{nicheStyle}.',
        'Bold opening composition with space for a title, light streaks sweeping across,',
        'professional motion graphics intro, 16:9'
      ].join(' '),
      b_roll: [
        'Cinematic {niche} b-roll scene: {topic}.',
        '{nicheStyle}.',
        'Shallow depth of field, smooth slow camera drift, color graded,',
        'professional YouTube footage'
      ].join(' '),
      background_loop: [
        'Seamless looping {mood} background for a {niche} talking-head video about {topic}.',
        '{nicheStyle}.',
        'Soft blurred shapes, gentle floating particles, subtle continuous drift,',
        'calm background suitable for on-screen text overlay'
      ].join(' '),
      outro: [
        'Warm {mood} YouTube outro backdrop referencing {topic}.',
        '{nicheStyle}.',
        'Fading glowing elements, space left for end-screen cards, gracious closing feel'
      ].join(' '),
      character_anim: [
        'Stylized animated {niche} mascot scene: {topic}.',
        '{nicheStyle}.',
        'Playful character energy, bouncing motion, vibrant colors,',
        'engaging animated story'
      ].join(' ')
    }
  }
};

module.exports = CAMPAIGNS_CONFIG;