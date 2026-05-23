/**
 * Background service worker for xuexitong_ds.
 *
 * Responsibilities:
 * - Handle messages from content scripts
 * - Coordinate between content scripts and extension storage
 * - Future: manage API requests that benefit from background execution
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[xuexitong_ds] Extension installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[xuexitong_ds] Background received message:', message.type);

  // Future: route messages to appropriate handlers
  switch (message.type) {
    case 'GET_API_CONFIG':
      // TODO: read from chrome.storage.local
      sendResponse({ success: true, data: null });
      break;
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  // Return true to indicate async response
  return true;
});
