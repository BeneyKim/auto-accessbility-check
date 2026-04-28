/**
 * DOM Traversal Engine — DFS 기반 SPA 크롤링
 * 인터랙티브 요소를 순회하며 모든 Depth의 화면을 탐색
 */

import type {
  ScanConfig,
  ScreenResult,
  ClassifiedIssue,
  ScanProgress,
  ExtensionMessage,
} from '@shared/types';
import { generateId, getDOMFingerprint, delay } from '@shared/utils';
import { AceWrapper } from '@engine/ace-wrapper';
import { ElementDetector } from './element-detector';
import { MutationWatcher } from './mutation-watcher';
import { NavigationManager } from './navigation';
import { IssueFilter } from '@filter/regex-filter';

export class DOMTraversal {
  private aceWrapper: AceWrapper;
  private detector: ElementDetector;
  private watcher: MutationWatcher;
  private navigation: NavigationManager;
  private filter: IssueFilter;
  private config: ScanConfig;

  private visitedFingerprints: Set<string> = new Set();
  private screens: ScreenResult[] = [];
  private isRunning = false;
  private currentPath: string[] = [];

  constructor(config: ScanConfig) {
    this.config = config;
    this.aceWrapper = new AceWrapper();
    this.detector = new ElementDetector();
    this.watcher = new MutationWatcher();
    this.navigation = new NavigationManager();
    this.filter = new IssueFilter(config.waiverRules);
  }

  /**
   * 크롤링 시작 — 현재 화면부터 DFS 순회
   */
  async start(): Promise<ScreenResult[]> {
    this.isRunning = true;
    this.visitedFingerprints.clear();
    this.screens = [];
    this.currentPath = [];

    try {
      await this.aceWrapper.initialize();
      await this.watcher.waitForLoadingComplete();
      await this.traverse(0);
    } catch (error) {
      console.error('[DOMTraversal] Critical error:', error);
      this.sendMessage({
        type: 'SCAN_ERROR',
        payload: {
          message: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      this.isRunning = false;
      this.watcher.disconnect();
    }

    return this.screens;
  }

  /**
   * 크롤링 중지
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * 재귀적 DFS 순회
   */
  private async traverse(depth: number): Promise<void> {
    if (!this.isRunning) return;
    if (depth > this.config.maxDepth) return;

    // 현재 화면 DOM 지문 확인
    const fingerprint = getDOMFingerprint();
    if (this.visitedFingerprints.has(fingerprint)) {
      console.log(`[DOMTraversal] Skipping already visited screen (fingerprint: ${fingerprint})`);
      return;
    }
    this.visitedFingerprints.add(fingerprint);

    // 로딩 완료 대기
    await this.watcher.waitForLoadingComplete(this.config.animationWaitMs);
    await delay(300); // 렌더링 안정화 대기

    // 1. 현재 화면 스캔
    const screenResult = await this.scanCurrentScreen(depth, fingerprint);
    if (screenResult) {
      this.screens.push(screenResult);
      this.sendProgress(depth, screenResult.name);
      this.sendMessage({
        type: 'SCAN_SCREEN_RESULT',
        payload: screenResult,
      });
    }

    // 2. 인터랙티브 요소 수집
    const elements = this.detector.detect();
    const limited = elements.slice(0, this.config.maxElementsPerScreen);

    console.log(`[DOMTraversal] Found ${elements.length} interactive elements at depth ${depth}`);

    // 3. 각 요소에 대해 클릭 → 상태 변화 감지 → 재귀
    for (const elem of limited) {
      if (!this.isRunning) break;

      this.detector.markVisited(elem.fingerprint);
      const beforeFingerprint = getDOMFingerprint();

      try {
        // 클릭
        this.currentPath.push(elem.label);
        (elem.element as HTMLElement).click();

        // DOM 변화 대기
        const mutation = await this.watcher.waitForDOMChange(this.config.mutationTimeoutMs);

        if (mutation) {
          if (mutation.hasNewLayer || mutation.hasRouteChange) {
            // 새 레이어/페이지 → 재귀 순회
            await delay(this.config.animationWaitMs);
            await this.traverse(depth + 1);

            // 복귀
            await this.navigation.closeCurrentLayer();
            await delay(300);
          }
        }

        this.currentPath.pop();
      } catch (error) {
        console.warn(`[DOMTraversal] Error interacting with element: ${elem.label}`, error);
        this.currentPath.pop();

        // 상태 복구 시도
        const afterFingerprint = getDOMFingerprint();
        if (afterFingerprint !== beforeFingerprint) {
          await this.navigation.closeCurrentLayer();
          await delay(300);
        }
      }
    }
  }

  /**
   * 현재 화면 ACE 스캔 실행
   */
  private async scanCurrentScreen(depth: number, fingerprint: string): Promise<ScreenResult | null> {
    try {
      const scanResult = await this.aceWrapper.scan(document, this.config.policies);

      // ACE 이슈 → ClassifiedIssue 변환
      const classifiedIssues = scanResult.issues.map(AceWrapper.toClassifiedIssue);

      // Waiver 필터 적용
      const filtered = this.filter.apply(classifiedIssues);

      // 스크린샷 요청 (Service Worker에서 처리)
      const screenshot = await this.requestScreenshot();

      const screen: ScreenResult = {
        id: generateId(),
        name: this.generateScreenName(),
        path: [...this.currentPath],
        depth,
        url: window.location.href,
        screenshotDataUrl: screenshot,
        timestamp: new Date().toISOString(),
        issues: [...filtered.activeIssues, ...filtered.flaggedIssues],
        issueSummary: scanResult.summary,
        domFingerprint: fingerprint,
      };

      console.log(
        `[DOMTraversal] Screen "${screen.name}" scanned: ` +
        `${filtered.stats.active} active, ${filtered.stats.flagged} flagged, ${filtered.stats.waived} waived`
      );

      return screen;
    } catch (error) {
      console.error('[DOMTraversal] Scan error:', error);
      return null;
    }
  }

  /**
   * Service Worker에 스크린샷 캡처 요청
   */
  private requestScreenshot(): Promise<string> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'CAPTURE_SCREENSHOT', payload: undefined },
        (response: { dataUrl: string } | undefined) => {
          resolve(response?.dataUrl || '');
        }
      );
    });
  }

  /**
   * 현재 화면 이름 자동 생성
   */
  private generateScreenName(): string {
    // URL 경로에서 이름 추출
    const path = window.location.pathname.split('/').filter(Boolean);
    const hash = window.location.hash.replace('#', '');

    // 페이지 제목
    const title = document.title;

    // h1 요소
    const h1 = document.querySelector('h1');
    const heading = h1?.textContent?.trim();

    if (heading) return heading;
    if (hash) return hash;
    if (path.length > 0) return path[path.length - 1];
    if (title) return title;

    return `Screen ${this.screens.length + 1}`;
  }

  /**
   * 진행 상태 전송
   */
  private sendProgress(depth: number, screenName: string): void {
    this.sendMessage({
      type: 'SCAN_PROGRESS',
      payload: {
        currentScreen: this.screens.length,
        totalScreens: -1, // SPA에서는 전체 수를 미리 알 수 없음
        currentDepth: depth,
        screenName,
        issuesFound: this.screens.reduce(
          (sum, s) => sum + s.issues.length, 0
        ),
        status: 'scanning',
      },
    });
  }

  /**
   * Service Worker로 메시지 전송
   */
  private sendMessage(message: ExtensionMessage): void {
    try {
      chrome.runtime.sendMessage(message);
    } catch (error) {
      console.warn('[DOMTraversal] Failed to send message:', error);
    }
  }
}
