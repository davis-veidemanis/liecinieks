export const IPC = {
  LOAD_MODEL: 'load-model',
  LIST_SCENARIOS: 'list-scenarios',
  LOAD_SCENARIO: 'load-scenario',
  SAVE_SCENARIO: 'save-scenario',
  EXPORT_PLAYWRIGHT: 'export-playwright',
  OPEN_TARGET: 'open-target',
  CLOSE_TARGET: 'close-target',
  SET_RECORDING_MODE: 'set-recording-mode',

  EVT_PAGE_CLICK: 'evt-page-click',
  EVT_PAGE_NAVIGATED: 'evt-page-navigated',
  EVT_PAGE_CLOSED: 'evt-page-closed',
  EVT_PAGE_ERROR: 'evt-page-error',
  EVT_ACTIVE_LABEL_CHANGED: 'evt-active-label-changed',
} as const;
