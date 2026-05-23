import type { Step } from '../types';
import { useStore } from './store';

// Renders the recorded steps with reorder/edit/delete controls.
export function StepList() {
  const scenario = useStore((s) => s.scenario);
  const removeStep = useStore((s) => s.removeStep);
  const moveStep = useStore((s) => s.moveStep);
  const updateStepText = useStore((s) => s.updateStepText);

  if (!scenario) {
    return <div className="step-list-empty">No scenario loaded.</div>;
  }
  if (scenario.steps.length === 0) {
    return (
      <div className="step-list-empty">
        No steps yet.<br />
        Click in the browser window to record one.
      </div>
    );
  }
  return (
    <div className="step-list">
      {scenario.steps.map((step, idx) => (
        <div key={step.id} className={'step ' + classFor(step)}>
          <div className="step-idx">{idx + 1}</div>
          <div className="step-body">
            <div className="step-row1">
              <span className={'step-tag ' + classFor(step)}>{tagLabel(step)}</span>
              {step.type === 'assert-visible' && (
                <span className="step-label">{step.label}</span>
              )}
            </div>
            <div className="step-detail">{describeStep(step)}</div>
            {step.type === 'assert-visible' && step.verifyLocation && (
              <div className="step-bbox">
                bbox {step.expectedBbox.x},{step.expectedBbox.y} {step.expectedBbox.w}×{step.expectedBbox.h} · iou≥{step.iouThreshold}
              </div>
            )}
            {step.type === 'type' && (
              <div className="step-edit">
                <input
                  type="text"
                  value={step.text}
                  onChange={(e) => updateStepText(step.id, e.target.value)}
                  placeholder="text to type…"
                />
              </div>
            )}
          </div>
          <div className="step-actions">
            <button onClick={() => moveStep(step.id, -1)} disabled={idx === 0} title="Move up">↑</button>
            <button onClick={() => moveStep(step.id, 1)} disabled={idx === scenario.steps.length - 1} title="Move down">↓</button>
            <button onClick={() => removeStep(step.id)} title="Delete">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Map a step to its CSS class for coloring in the list.
function classFor(step: Step): string {
  if (step.type === 'navigate') return 't-navigate';
  if (step.type === 'type') return 't-type';
  return step.negate ? 't-assert-not' : 't-assert';
}

// Human-readable tag shown next to each step row.
function tagLabel(step: Step): string {
  if (step.type === 'navigate') return 'Navigate';
  if (step.type === 'type') return 'Type';
  if (step.negate) return 'Not visible';
  return 'Visible';
}

// One-line description of a step (selector for clicks, text for typing, etc.).
function describeStep(step: Step): string {
  if (step.type === 'navigate') {
    const sel = truncate(step.selector, 64);
    return step.fallbackText ? `${sel}, "${truncate(step.fallbackText, 36)}"` : sel;
  }
  if (step.type === 'type') {
    return `${truncate(step.selector, 44)} ← ${JSON.stringify(step.text)}`;
  }
  return step.verifyLocation
    ? 'Visibility + location'
    : 'Anywhere on screen';
}

// Trim a string to n characters, appending an ellipsis when shortened.
function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}
