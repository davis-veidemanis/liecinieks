import { useEffect, useState } from 'react';
import { SetupScreen } from './SetupScreen';
import { RecorderScreen } from './RecorderScreen';
import { useStore } from './store';
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
  }, [themePref]);

  const scenario = useStore((s) => s.scenario);
  const labels = useStore((s) => s.labels);
  const weightsPath = useStore((s) => s.weightsPath);
  const setNotice = useStore((s) => s.setNotice);
  const notice = useStore((s) => s.notice);

  async function continueToRecorder() {
    setScreen('record');
  }

  function backToSetup() {
    setScreen('setup');
  }

  const modelName = weightsPath ? weightsPath.split('/').pop() : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Liecinieks</div>
        <div className="topbar-info">
          <span><span className="label">Model</span>{modelName ?? 'not loaded'}</span>
          <span><span className="label">Labels</span>{labels.length}</span>
        </div>
        <div className="topbar-right">
          <div className="theme-toggle" role="group" aria-label="Theme">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button
                key={t}
                className={themePref === t ? 'active' : ''}
                onClick={() => setThemePref(t)}
              >
                {t === 'system' ? 'Auto' : t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
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
      </footer>

      {notice && <div className="notice">{notice}</div>}
    </div>
  );
}
