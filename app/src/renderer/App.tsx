import { useEffect, useState } from 'react';
import { SetupScreen } from './SetupScreen';
import { RecorderScreen } from './RecorderScreen';
import { useStore, buildStepFromOverlayPayload } from './store';
import { liecinieks } from './types-bridge';

type Screen = 'setup' | 'record';
type ThemePref = 'system' | 'light' | 'dark';

const THEME_KEY = 'liecinieks-theme';

function readThemePref(): ThemePref {
  const v = localStorage.getItem(THEME_KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

function applyTheme(theme: ThemePref): void {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [themePref, setThemePref] = useState<ThemePref>(readThemePref);

  useEffect(() => {
    applyTheme(themePref);
    localStorage.setItem(THEME_KEY, themePref);
    if (themePref !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [themePref]);

  const scenario = useStore((s) => s.scenario);
  const labels = useStore((s) => s.labels);
  const weightsPath = useStore((s) => s.weightsPath);
  const pageOpen = useStore((s) => s.pageOpen);
  const setPageOpen = useStore((s) => s.setPageOpen);
  const appendStep = useStore((s) => s.appendStep);
  const setNotice = useStore((s) => s.setNotice);
  const notice = useStore((s) => s.notice);

  useEffect(() => {
    const offClick = liecinieks.on('evt-page-click', (payload) => {
      if (!payload || typeof payload !== 'object') return;
      const step = buildStepFromOverlayPayload(payload as Parameters<typeof buildStepFromOverlayPayload>[0]);
      appendStep(step);
    });
    const offNav = liecinieks.on('evt-page-navigated', (payload) => {
      const url = (payload as { url?: string } | null)?.url ?? '';
      setPageOpen(true, url);
    });
    const offClosed = liecinieks.on('evt-page-closed', () => {
      setPageOpen(false);
    });
    const offError = liecinieks.on('evt-page-error', (payload) => {
      const msg = (payload as { message?: string } | null)?.message ?? 'Page error';
      setNotice(msg);
    });
    const offLabel = liecinieks.on('evt-active-label-changed', (payload) => {
      const p =
        (payload as { label?: string | null; verifyLocation?: boolean; negate?: boolean } | null) ?? {};
      useStore.getState().setActiveLabel(p.label ?? null, !!p.verifyLocation, !!p.negate);
    });
    return () => {
      offClick();
      offNav();
      offClosed();
      offError();
      offLabel();
    };
  }, [appendStep, setPageOpen, setNotice]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4200);
    return () => clearTimeout(t);
  }, [notice, setNotice]);

  async function continueToRecorder() {
    const s = useStore.getState().scenario;
    if (!s) return;
    try {
      await liecinieks.openTarget(s.startUrl, s.viewport, s.deviceScaleFactor ?? 1);
      setScreen('record');
    } catch (err) {
      setNotice('Failed to open browser: ' + (err as Error).message);
    }
  }

  function backToSetup() {
    setScreen('setup');
  }

  const modelName = weightsPath ? weightsPath.split('/').pop() : null;
  const stepCount = scenario?.steps.length ?? 0;
  const navSteps = scenario?.steps.filter((s) => s.type === 'navigate').length ?? 0;
  const typeSteps = scenario?.steps.filter((s) => s.type === 'type').length ?? 0;
  const assertSteps = scenario?.steps.filter((s) => s.type === 'assert-visible').length ?? 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Liecinieks</div>
        <div className="topbar-info">
          <span>
            <span className="label">Model</span>
            {modelName ?? 'not loaded'}
          </span>
          <span>
            <span className="label">Labels</span>
            {labels.length}
          </span>
        </div>
        <div className="topbar-right">
          <div className="theme-toggle" role="group" aria-label="Theme">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button
                key={t}
                className={themePref === t ? 'active' : ''}
                onClick={() => setThemePref(t)}
                title={t === 'system' ? 'Match OS theme' : `Force ${t} theme`}
              >
                {t === 'system' ? 'Auto' : t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
          <span className="screen-badge">
            <span className="dot" />
            {screen === 'setup' ? 'Setup' : 'Recording'}
          </span>
        </div>
      </header>

      <div className={'workspace ' + (screen === 'setup' ? 'setup' : 'record')}>
        {screen === 'setup' ? (
          <SetupScreen onContinue={continueToRecorder} />
        ) : (
          <RecorderScreen onBack={backToSetup} />
        )}
      </div>

      <footer className="statusbar">
        <span className="seg">
          <span className="k">Scenario:</span>
          <span className="v">{scenario?.name ?? '—'}</span>
        </span>
        <span className="seg">
          <span className="k">Steps:</span>
          <span className="v">
            {stepCount} ({navSteps} nav, {typeSteps} type, {assertSteps} assert)
          </span>
        </span>
        <span className="seg">
          <span className="k">Browser:</span>
          <span className={'v ' + (pageOpen ? 'ok' : 'warn')}>{pageOpen ? 'open' : 'closed'}</span>
        </span>
        <span className="spacer" />
        <span className="seg">
          <span className="k">Viewport:</span>
          <span className="v">{scenario ? `${scenario.viewport.width}×${scenario.viewport.height}` : '—'}</span>
        </span>
      </footer>

      {notice && <div className="notice">{notice}</div>}
    </div>
  );
}
