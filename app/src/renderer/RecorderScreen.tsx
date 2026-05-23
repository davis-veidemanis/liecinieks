import { useState } from 'react';
import { useStore } from './store';
import { liecinieks } from './types-bridge';
import { StepList } from './StepList';

// Recording UI: shows the active scenario, step list, and save/export controls.
export function RecorderScreen({ onBack }: { onBack: () => void }) {
  const scenario = useStore((s) => s.scenario);
  const setNotice = useStore((s) => s.setNotice);
  const pageOpen = useStore((s) => s.pageOpen);
  const activeLabel = useStore((s) => s.activeLabel);
  const verifyLocation = useStore((s) => s.verifyLocation);
  const negate = useStore((s) => s.negate);

  const [savingBusy, setSavingBusy] = useState(false);

  if (!scenario) {
    return null;
  }

  // Persist the current scenario to disk and show a toast with the file name.
  async function saveScenario() {
    if (!scenario) return;
    setSavingBusy(true);
    try {
      const file = await liecinieks.saveScenario(scenario);
      setNotice('Saved: ' + file);
    } catch (err) {
      setNotice('Save failed: ' + (err as Error).message);
    } finally {
      setSavingBusy(false);
    }
  }

  // Export the recorded steps as a Playwright spec, prompting for an output folder.
  async function exportCode() {
    if (!scenario) return;
    if (scenario.steps.length === 0) {
      setNotice('Record at least one step before exporting.');
      return;
    }
    setSavingBusy(true);
    try {
      const result = await liecinieks.exportPlaywright(scenario);
      if (!result) {
        setNotice('Export cancelled.');
        return;
      }
      setNotice('Exported: ' + result.specFile);
    } catch (err) {
      setNotice('Export failed: ' + (err as Error).message);
    } finally {
      setSavingBusy(false);
    }
  }

  // Tear down the Playwright browser and return to the setup screen.
  async function closeBrowser() {
    await liecinieks.closeTarget();
    onBack();
  }

  return (
    <>
      <main className="main-pane">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-tag">Active scenario</span>
            <div className="button-row">
              <button onClick={saveScenario} disabled={savingBusy}>Save scenario</button>
              <button className="primary" onClick={exportCode} disabled={savingBusy}>Export Playwright…</button>
              <button className="danger" onClick={closeBrowser}>Close & finish</button>
            </div>
          </div>
          <h2 className="panel-title">{scenario.name}</h2>

          <div className="scenario-meta">
            <div className="meta-cell">
              <div className="mk">URL</div>
              <div className="mv">{scenario.startUrl}</div>
            </div>
            <div className="meta-cell">
              <div className="mk">Viewport</div>
              <div className="mv">
                {scenario.viewport.width}×{scenario.viewport.height}
                {scenario.deviceScaleFactor > 1 ? ` @${scenario.deviceScaleFactor}x` : ''}
              </div>
            </div>
            <div className="meta-cell">
              <div className="mk">Steps</div>
              <div className="mv big">{scenario.steps.length}</div>
            </div>
            <div className="meta-cell">
              <div className="mk">Browser</div>
              <div className="mv" style={{ color: pageOpen ? 'var(--success)' : 'var(--warn)' }}>
                {pageOpen ? 'open' : 'closed'}
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2 className="panel-title">How to record</h2>
          <div className="active-label-row">
            <span className="mk" style={{ marginRight: 4, marginBottom: 0 }}>Active label:</span>
            {activeLabel ? (
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 4,
                  fontSize: 12.5,
                  fontWeight: 500,
                  background: negate ? 'var(--danger-soft)' : 'var(--accent-soft)',
                  color: negate ? 'var(--danger)' : 'var(--accent)',
                }}
              >
                {negate ? 'NOT ' : ''}
                {activeLabel}
                {verifyLocation ? ' · +loc' : ''}
              </span>
            ) : (
              <span style={{ color: 'var(--text-faint)', fontSize: 12.5 }}>
                none, right-click in the browser to pick one
              </span>
            )}
          </div>
          <ul className="how-to-list">
            <li>
              <b>Right-click</b> any element to open the label picker. Pick a chip and it becomes
              the active label for the rest of the session. The toggles (<i>Verify location</i>,{' '}
              <i>NOT visible</i>) are sticky and apply to every Shift+click that follows.
            </li>
            <li>
              <b>Hold Shift</b> to enter assertion-targeting mode, a small pill follows the
              cursor showing the active label. <b>Shift+click</b> an element to record a
              visibility assertion (green flash = recorded; amber flash = no label set).
            </li>
            <li>
              <b>Plain left-click</b> is just normal browsing, the click is recorded as a
              navigation step and propagates to the page (inputs still open the type-text dialog).
            </li>
          </ul>
        </section>
      </main>

      <aside className="side-pane">
        <div className="step-pane-header">
          <span className="lab">Steps</span>
          <span className="count"><b>{scenario.steps.length}</b> step{scenario.steps.length !== 1 ? 's' : ''}</span>
        </div>
        <StepList />
      </aside>
    </>
  );
}
