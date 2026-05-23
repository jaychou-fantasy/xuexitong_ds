/**
 * Content script entry point for xuexitong_ds.
 *
 * Injected into Chaoxing pages via manifest.json content_scripts.
 * Detects page type and mounts the floating assistant panel.
 */

import { isChaoxingPage, getPageMode } from '@platforms/chaoxing/detector';
import { mountPanel } from './floating-panel';

console.log('[xuexitong_ds] Content script loaded');

function init(): void {
  if (!isChaoxingPage()) {
    console.log('[xuexitong_ds] Not a Chaoxing page, skipping');
    return;
  }

  const mode = getPageMode();
  console.log('[xuexitong_ds] Chaoxing page detected, mode:', mode);

  if (mode !== 'unknown') {
    mountPanel();
  } else {
    console.log('[xuexitong_ds] Page mode unknown, mounting panel anyway');
    mountPanel();
  }
}

// Run on script load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
