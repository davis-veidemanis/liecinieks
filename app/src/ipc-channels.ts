// Centralised string constants for every Electron IPC channel the app uses.
// Keeping them in one file means the preload allowlist, the renderer-side
// `liecinieks` bridge, and the main-process handlers all agree on the same
// channel names without scattering string literals across the codebase.

export const IPC = {
  // Renderer → Main (invoke). These are request/response style and return a value.
  LOAD_MODEL: 'load-model',
  LIST_SCENARIOS: 'list-scenarios',
  LOAD_SCENARIO: 'load-scenario',
  SAVE_SCENARIO: 'save-scenario',
  EXPORT_PLAYWRIGHT: 'export-playwright',
  OPEN_TARGET: 'open-target',
  CLOSE_TARGET: 'close-target',
  SET_RECORDING_MODE: 'set-recording-mode',

  // Main → Renderer (event). These are fire-and-forget pushes from the
  // Playwright host into the React store.
  EVT_PAGE_CLICK: 'evt-page-click',
  EVT_PAGE_NAVIGATED: 'evt-page-navigated',
  EVT_PAGE_CLOSED: 'evt-page-closed',
  EVT_PAGE_ERROR: 'evt-page-error',
  EVT_ACTIVE_LABEL_CHANGED: 'evt-active-label-changed',
} as const;
