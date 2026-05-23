/**
 * Floating panel injection entry point.
 *
 * Creates a Shadow DOM container on the host page, injects the
 * compiled Tailwind CSS, and mounts the React panel inside it.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Import compiled Tailwind CSS as a raw string.
// In webpack, .shadow.css files are processed by postcss-loader
// then imported as raw text via raw-loader.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — raw-loader import, webpack resolves this
import tailwindCSS from './styles/app.shadow.css';

const CONTAINER_ID = 'xuexitong-ds-panel-host';

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

/**
 * Mount the floating panel into the host page.
 * Safe to call multiple times — will not duplicate.
 */
export function mountPanel(): void {
  if (container && document.getElementById(CONTAINER_ID)) {
    // Already mounted
    return;
  }

  // Create host container
  container = document.createElement('div');
  container.id = CONTAINER_ID;
  document.body.appendChild(container);

  // Create Shadow DOM
  const shadowRoot = container.attachShadow({ mode: 'closed' });

  // Inject Tailwind CSS into shadow root
  const styleEl = document.createElement('style');
  styleEl.textContent = tailwindCSS;
  shadowRoot.appendChild(styleEl);

  // Create React root element inside shadow
  const reactRoot = document.createElement('div');
  reactRoot.id = 'xxt-panel-root';
  shadowRoot.appendChild(reactRoot);

  // Mount React
  root = createRoot(reactRoot);
  root.render(React.createElement(App));

  console.log('[xuexitong_ds] Floating panel mounted');
}

/**
 * Remove the floating panel from the page.
 */
export function unmountPanel(): void {
  if (root) {
    root.unmount();
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  console.log('[xuexitong_ds] Floating panel unmounted');
}
