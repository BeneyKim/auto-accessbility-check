/**
 * Content Script — Entry Point
 * ThinQ Web 페이지에 주입되어 ACE 엔진 구동 및 DOM 크롤링 수행
 */

import type { ExtensionMessage, ScanConfig, FullReport, ReportMetadata } from '@shared/types';
import { DOMTraversal } from '@crawler/traversal';
import { JsonReporter } from '@reporter/json-reporter';
import { MarkdownReporter } from '@reporter/md-reporter';
import { DEFAULT_SCAN_CONFIG } from '@shared/types';

let traversal: DOMTraversal | null = null;

/**
 * Service Worker로부터의 메시지 수신 처리
 */
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    switch (message.type) {
      case 'START_SCAN':
        handleStartScan(message.payload);
        sendResponse({ status: 'started' });
        break;

      case 'STOP_SCAN':
        handleStopScan();
        sendResponse({ status: 'stopped' });
        break;

      default:
        break;
    }

    // 비동기 응답을 위해 true 반환
    return true;
  }
);

/**
 * 스캔 시작 처리
 */
async function handleStartScan(config: ScanConfig): Promise<void> {
  console.log('[ContentScript] Starting accessibility scan with config:', config);

  if (traversal) {
    traversal.stop();
  }

  traversal = new DOMTraversal(config);
  const startTime = new Date();

  try {
    const screens = await traversal.start();
    const endTime = new Date();

    // 리포트 메타데이터 생성
    const metadata: ReportMetadata = {
      productName: config.selectedProduct || document.title || 'Unknown Product',
      executionTime: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        durationMs: endTime.getTime() - startTime.getTime(),
      },
      environment: {
        browser: navigator.userAgent,
        extensionVersion: chrome.runtime.getManifest().version,
        aceVersion: '4.x',
        policies: config.policies,
      },
      scanConfig: config,
    };

    // JSON 리포트 생성
    const jsonReporter = new JsonReporter();
    const fullReport = jsonReporter.generate(screens, metadata);

    // 완료 메시지 전송
    chrome.runtime.sendMessage({
      type: 'SCAN_COMPLETE',
      payload: fullReport,
    } as ExtensionMessage);

    console.log('[ContentScript] Scan complete.', {
      screens: screens.length,
      totalIssues: fullReport.summary.totalIssues,
    });
  } catch (error) {
    console.error('[ContentScript] Scan failed:', error);
    chrome.runtime.sendMessage({
      type: 'SCAN_ERROR',
      payload: {
        message: error instanceof Error ? error.message : String(error),
      },
    } as ExtensionMessage);
  }
}

/**
 * 스캔 중지 처리
 */
function handleStopScan(): void {
  if (traversal) {
    traversal.stop();
    traversal = null;
  }
  console.log('[ContentScript] Scan stopped.');
}

// 초기 로드 확인
console.log('[ContentScript] LG ThinQ A11y Checker content script loaded.');
