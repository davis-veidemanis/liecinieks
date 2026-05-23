import { useState } from 'react';
import { useStore } from './store';
import { liecinieks } from './types-bridge';
import type { ViewportSize } from '../types';
import { VIEWPORT_PRESETS } from '../types';

// First-screen UI: load a YOLO model, name the scenario, and pick the viewport.
export function SetupScreen({ onContinue }: { onContinue: () => void }) {
  const labels = useStore((s) => s.labels);
  const weightsPath = useStore((s) => s.weightsPath);
  const labelsCsvPath = useStore((s) => s.labelsCsvPath);
  const setModel = useStore((s) => s.setModel);
  const startScenario = useStore((s) => s.startScenario);
  const setNotice = useStore((s) => s.setNotice);

  const [scenarioName, setScenarioName] = useState('');
  const [startUrl, setStartUrl] = useState('https://practicesoftwaretesting.com/');
  const [presetIdx, setPresetIdx] = useState<number | 'custom'>(0);
  const [customWidth, setCustomWidth] = useState(1440);
  const [customHeight, setCustomHeight] = useState(900);
  const [customDsf, setCustomDsf] = useState(2);

  // Open the model + labels picker and push the loaded weights into the store.
  async function chooseModel() {
    try {
      const data = await liecinieks.loadModel();
      if (!data) return;
      setModel(data);
      setNotice(`Loaded ${data.labels.length} labels.`);
    } catch (err) {
      setNotice('Failed to load model: ' + (err as Error).message);
    }
  }

  // Validate the form, create a fresh scenario in the store, and continue to the recorder.
  function startNew() {
    if (!scenarioName.trim()) {
      setNotice('Scenario needs a name.');
      return;
    }
    if (!startUrl.trim()) {
      setNotice('Start URL is required.');
      return;
    }
    try {
      const u = new URL(startUrl.trim());
      if (!['http:', 'https:'].includes(u.protocol)) {
        setNotice('Start URL must use http:// or https://.');
        return;
      }
    } catch {
      setNotice('Start URL is not a valid URL.');
      return;
    }
    if (labels.length === 0) {
      setNotice('Load a YOLO model + labels CSV first.');
      return;
    }
    let viewport: ViewportSize;
    let deviceScaleFactor: number;
    if (presetIdx === 'custom') {
      if (!Number.isFinite(customWidth) || customWidth < 200 || customWidth > 8000) {
        setNotice('Custom width must be between 200 and 8000.');
        return;
      }
      if (!Number.isFinite(customHeight) || customHeight < 200 || customHeight > 8000) {
        setNotice('Custom height must be between 200 and 8000.');
        return;
      }
      if (!Number.isFinite(customDsf) || customDsf <= 0 || customDsf > 4) {
        setNotice('Custom scale factor must be > 0 and ≤ 4.');
        return;
      }
      viewport = { width: Math.round(customWidth), height: Math.round(customHeight) };
      deviceScaleFactor = customDsf;
    } else {
      const preset = VIEWPORT_PRESETS[presetIdx];
      viewport = preset.size;
      deviceScaleFactor = preset.deviceScaleFactor;
    }
    startScenario({
      name: scenarioName.trim(),
      viewport,
      deviceScaleFactor,
      startUrl: startUrl.trim(),
    });
    onContinue();
  }

  return (
    <div style={{ width: '100%', maxWidth: 960 }}>
      <div className="setup-heading">
        <h1>Liecinieks</h1>
        <p>Visual UI testing with Playwright + YOLO.</p>
      </div>

      <div className="setup-grid">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-tag">Step 1 of 2</span>
          </div>
          <h2 className="panel-title">Detector model</h2>
          <p className="panel-sub">
            Pick the trained YOLO weights file (<span className="mono">.pt</span>) and the
            labels CSV (<span className="mono">class_id, class_name</span>).
          </p>

          {weightsPath ? (
            <>
              <div className="model-loaded">
                <div className="kv">
                  <span className="k">Weights:</span>
                  <span className="v">{weightsPath}</span>
                </div>
                <div className="kv">
                  <span className="k">Labels CSV:</span>
                  <span className="v">{labelsCsvPath}</span>
                </div>
              </div>

              <div className="label-count">
                <span><b>{labels.length}</b> classes loaded</span>
                <span className="spacer" />
                <button className="ghost sm" onClick={chooseModel}>Replace…</button>
              </div>
            </>
          ) : (
            <div className="button-row">
              <button className="primary" onClick={chooseModel}>Choose files…</button>
              <span className="muted">First select the .pt, then the .csv.</span>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <span className="panel-tag">Step 2 of 2</span>
          </div>
          <h2 className="panel-title">Scenario</h2>
          <p className="panel-sub">
            One scenario = one recording, one viewport, one generated test file.
          </p>

          <label className="field">
            <span className="field-label">Scenario name</span>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="e.g. Login with empty fields"
              maxLength={80}
            />
          </label>

          <label className="field">
            <span className="field-label">Start URL</span>
            <input
              type="url"
              value={startUrl}
              onChange={(e) => setStartUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>

          <label className="field">
            <span className="field-label">Viewport</span>
            <div className="viewport-grid">
              {VIEWPORT_PRESETS.map((p, i) => (
                <button
                  type="button"
                  key={p.name}
                  className={'viewport-tile' + (presetIdx === i ? ' active' : '')}
                  onClick={() => setPresetIdx(i)}
                >
                  <span className="vt-name">{p.name.split(' ')[0]}</span>
                  <span className="vt-dims">
                    {p.size.width}×{p.size.height}
                    {p.deviceScaleFactor > 1 ? ` @${p.deviceScaleFactor}x` : ''}
                  </span>
                </button>
              ))}
              <button
                type="button"
                className={'viewport-tile' + (presetIdx === 'custom' ? ' active' : '')}
                onClick={() => setPresetIdx('custom')}
              >
                <span className="vt-name">Custom</span>
                <span className="vt-dims">
                  {presetIdx === 'custom'
                    ? `${customWidth}×${customHeight}${customDsf > 1 ? ` @${customDsf}x` : ''}`
                    : 'set your own'}
                </span>
              </button>
            </div>
            {presetIdx === 'custom' && (
              <div className="custom-viewport">
                <label className="cv-cell">
                  <span>Width</span>
                  <input
                    type="number"
                    min={200}
                    max={8000}
                    value={customWidth}
                    onChange={(e) => setCustomWidth(parseInt(e.target.value, 10) || 0)}
                  />
                </label>
                <label className="cv-cell">
                  <span>Height</span>
                  <input
                    type="number"
                    min={200}
                    max={8000}
                    value={customHeight}
                    onChange={(e) => setCustomHeight(parseInt(e.target.value, 10) || 0)}
                  />
                </label>
                <label className="cv-cell">
                  <span>Scale (DPR)</span>
                  <input
                    type="number"
                    min={0.5}
                    max={4}
                    step={0.5}
                    value={customDsf}
                    onChange={(e) => setCustomDsf(parseFloat(e.target.value) || 0)}
                  />
                </label>
              </div>
            )}
          </label>

          <div className="button-row" style={{ marginTop: 14 }}>
            <button className="primary" onClick={startNew}>
              Open browser & start recording
            </button>
          </div>
        </section>
      </div>

      <p className="muted" style={{ marginTop: 20 }}>
        Hotkeys: right-click = pick label · Shift+click = assert visible · plain click = navigate
      </p>
    </div>
  );
}
