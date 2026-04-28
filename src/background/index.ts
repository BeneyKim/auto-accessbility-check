/**
 * Service Worker (Background) — 메시지 라우팅, 스크린샷, 파일 다운로드
 */

import type { ExtensionMessage, FullReport, ScanConfig, ScanProgress } from '@shared/types';
import { DEFAULT_SCAN_CONFIG } from '@shared/types';
import { MarkdownReporter } from '@reporter/md-reporter';

// ─── State ───────────────────────────────────────────────────
let currentConfig: ScanConfig = { ...DEFAULT_SCAN_CONFIG };
let latestReport: FullReport | null = null;
let latestProgress: ScanProgress | null = null;

// ─── Message Handling ────────────────────────────────────────
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    switch (message.type) {
      case 'CAPTURE_SCREENSHOT':
        handleScreenshot(sender.tab?.id).then(dataUrl => {
          sendResponse({ dataUrl });
        });
        return true; // async response

      case 'SCAN_COMPLETE':
        latestReport = message.payload;
        latestProgress = {
          currentScreen: latestReport.summary.totalScreens,
          totalScreens: latestReport.summary.totalScreens,
          currentDepth: 0,
          screenName: 'Complete',
          issuesFound: (Object.values(latestReport.summary.totalIssues) as number[])
            .reduce((a: number, b: number) => a + b, 0),
          status: 'complete',
        };
        console.log('[Background] Scan complete. Report received.');
        break;

      case 'SCAN_PROGRESS':
        latestProgress = message.payload;
        break;

      case 'SCAN_ERROR':
        console.error('[Background] Scan error:', message.payload.message);
        latestProgress = {
          currentScreen: 0,
          totalScreens: 0,
          currentDepth: 0,
          screenName: 'Error',
          issuesFound: 0,
          status: 'error',
        };
        break;

      case 'GET_CONFIG':
        sendResponse(currentConfig);
        return false;

      default:
        break;
    }
  }
);

// ─── Popup Communication (via chrome.runtime.connect) ─────────
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    port.onMessage.addListener(async (msg: { action: string; payload?: unknown }) => {
      switch (msg.action) {
        case 'getStatus':
          port.postMessage({ action: 'status', payload: latestProgress });
          break;

        case 'getConfig':
          port.postMessage({ action: 'config', payload: currentConfig });
          break;

        case 'updateConfig':
          currentConfig = { ...currentConfig, ...(msg.payload as Partial<ScanConfig>) };
          await chrome.storage.local.set({ scanConfig: currentConfig });
          port.postMessage({ action: 'configUpdated', payload: currentConfig });
          break;

        case 'startScan':
          latestReport = null;
          latestProgress = { currentScreen: 0, totalScreens: -1, currentDepth: 0, screenName: 'Starting...', issuesFound: 0, status: 'scanning' };
          // Content Script에 스캔 시작 메시지 전송
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) {
            try {
              await chrome.tabs.sendMessage(tab.id, {
                type: 'START_SCAN',
                payload: currentConfig,
              } as ExtensionMessage);
            } catch (err) {
              console.warn('[Background] Failed to send START_SCAN. Content script might not be loaded. Please refresh the page.', err);
              port.postMessage({ action: 'scanError', payload: '페이지를 새로고침한 후 다시 시도해주세요.' });
              break;
            }
          }
          port.postMessage({ action: 'scanStarted' });
          break;

        case 'stopScan':
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            try {
              await chrome.tabs.sendMessage(activeTab.id, {
                type: 'STOP_SCAN',
                payload: undefined,
              } as ExtensionMessage);
            } catch (err) {
              console.warn('[Background] Failed to send STOP_SCAN.', err);
            }
          }
          if (latestProgress) latestProgress.status = 'stopped';
          port.postMessage({ action: 'scanStopped' });
          break;

        case 'exportJSON':
          if (latestReport) {
            downloadReport(
              JSON.stringify(latestReport, null, 2),
              `a11y-report-${Date.now()}.json`,
              'application/json'
            );
          }
          break;

        case 'exportMarkdown':
          if (latestReport) {
            const mdReporter = new MarkdownReporter();
            const md = mdReporter.generate(latestReport);
            downloadReport(
              md,
              `a11y-report-${Date.now()}.md`,
              'text/markdown'
            );
          }
          break;

        case 'getReport':
          port.postMessage({ action: 'report', payload: latestReport });
          break;
      }
    });

    // 주기적으로 진행 상태 전송
    const progressInterval = setInterval(() => {
      if (latestProgress) {
        port.postMessage({ action: 'status', payload: latestProgress });
      }
    }, 1000);

    port.onDisconnect.addListener(() => {
      clearInterval(progressInterval);
    });
  }
});

// ─── Screenshot Capture ──────────────────────────────────────
async function handleScreenshot(_tabId?: number): Promise<string> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: 'jpeg',
      quality: 80,
    });
    return dataUrl;
  } catch (error) {
    console.warn('[Background] Screenshot capture failed:', error);
    return '';
  }
}

// ─── File Download ───────────────────────────────────────────
function downloadReport(content: string, filename: string, mimeType: string): void {
  // MV3 Service Worker에서는 URL.createObjectURL(blob) 사용이 불가능하므로 Data URL 형식 사용
  const base64Content = btoa(unescape(encodeURIComponent(content)));
  const dataUrl = `data:${mimeType};base64,${base64Content}`;

  chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs: true,
  });
}

// ─── Load saved config on startup ────────────────────────────
chrome.storage.local.get('scanConfig', (result) => {
  if (result.scanConfig) {
    currentConfig = { ...DEFAULT_SCAN_CONFIG, ...result.scanConfig };
  }
});

console.log('[Background] LG ThinQ A11y Checker service worker initialized.');
