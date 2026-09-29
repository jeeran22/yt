import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import api from './api/client.js';
import { ensurePresets } from './lib/presets.js';
import * as jobStore from './lib/jobs.js';
import ThemePicker from './components/ThemePicker.jsx';
import ImageGen from './views/ImageGen.jsx';
import TextToVideo from './views/TextToVideo.jsx';
import ImageToVideo from './views/ImageToVideo.jsx';
import StitchStudio from './views/StitchStudio.jsx';
import CampaignMarketing from './views/CampaignMarketing.jsx';
import CampaignYouTube from './views/CampaignYouTube.jsx';
import JobsPanel from './views/JobsPanel.jsx';

const TABS = [
  { id: 'image',      icon: '🖼️', label: 'Image Gen',      view: ImageGen },
  { id: 'text-video', icon: '🎬', label: 'Text-to-Video',  view: TextToVideo },
  { id: 'image-video',icon: '🎞️', label: 'Image-to-Video', view: ImageToVideo },
  { id: 'stitch',     icon: '🧩', label: 'Stitch Studio',  view: StitchStudio },
  { id: 'marketing',  icon: '📢', label: 'Marketing',      view: CampaignMarketing },
  { id: 'youtube',    icon: '▶️', label: 'YouTube',        view: CampaignYouTube },
  { id: 'jobs',       icon: '⚙️', label: 'Jobs',           view: JobsPanel }
];

function readHash() {
  const m = /^#\/([\w-]+)/.exec(window.location.hash || '');
  const id = m ? m[1] : 'image';
  return TABS.some((t) => t.id === id) ? id : 'image';
}

function App() {
  const [tab, setTabState] = useState(readHash);
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(false);
  const [tick, setTick] = useState(0);

  const setTab = (id) => {
    setTabState(id);
    try { window.history.replaceState(null, '', `#/${id}`); } catch (e) { /* ignore */ }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onHash = () => setTabState(readHash());
    window.addEventListener('hashchange', onHash);
    api.getHealth().then(setHealth).catch(() => setHealthError(true));
    ensurePresets().catch(() => {});
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Global poller: refreshes every active async job every 2s (backoff happens
  // server-side; this keeps the Jobs panel and the header badge live).
  useEffect(() => {
    const timer = setInterval(() => {
      jobStore.activeJobs().forEach((j) => jobStore.refreshJob(j));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Re-render the header badge whenever the job registry changes.
  useEffect(() => jobStore.subscribe(() => setTick((t) => t + 1)), []);

  void tick; // used purely as a re-render trigger

  const active = TABS.find((t) => t.id === tab) || TABS[0];
  const ActiveView = active.view;
  const running = jobStore.activeJobs().length;

  return (
    <div className="app">
      <header className="header">
        <button type="button" className="brand" onClick={() => setTab('image')} title="Stability Studio">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span className="brand-text">
            <strong>Stability Studio</strong>
            <span className="brand-sub">AI Image &amp; Video Generation</span>
          </span>
        </button>
        <StatusPill health={health} error={healthError} />
        <div className="header-tools">
          <button type="button" className="link-btn" onClick={() => setTab('jobs')} title={`${running} active job${running === 1 ? '' : 's'}`}>
            ⚙️ Jobs{running ? <span className="badge">{running}</span> : null}
          </button>
          <ThemePicker />
        </div>
      </header>

      <nav className="tabs" aria-label="Studio tools">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'tab is-active' : 'tab'}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <span className="tab-icon" aria-hidden="true">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="main">
        <ActiveView key={tab} setTab={setTab} />
      </main>

      <footer className="footer">
        <span>✦ Stability Studio alpha</span>
        <span className="mono">dev proxy: /api → http://localhost:1000</span>
        <span>Images: Stable Diffusion 3 Turbo · Video: Stable Video Diffusion · Stitch: ffmpeg</span>
      </footer>
    </div>
  );
}

function StatusPill({ health, error }) {
  if (error) {
    return (
      <span className="status-pill is-down" title="GET /health failed">
        <span className="status-dot" aria-hidden="true" />
        Backend offline — start <code>node src/server.js</code> on :1000
      </span>
    );
  }
  if (!health) {
    return (
      <span className="status-pill is-loading">
        <span className="status-dot" aria-hidden="true" />
        Connecting…
      </span>
    );
  }
  return (
    <span className="status-pill is-up" title={`${health.service} · v${health.version || '?'}`}>
      <span className="status-dot" aria-hidden="true" />
      {health.model} · {health.videoModel}
    </span>
  );
}

createRoot(document.getElementById('app')).render(<App />);