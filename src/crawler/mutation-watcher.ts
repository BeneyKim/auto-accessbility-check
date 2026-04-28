/**
 * MutationWatcher — DOM 변화 감지
 * SPA 라우팅, 모달/바텀시트 출현, 로딩 완료 등을 감지
 */

export interface MutationSummary {
  addedNodes: number;
  removedNodes: number;
  hasNewLayer: boolean;
  hasRouteChange: boolean;
  domFingerprint: string;
}

export class MutationWatcher {
  private observer: MutationObserver | null = null;
  private previousUrl: string = '';

  constructor() {
    this.previousUrl = window.location.href;
  }

  /**
   * DOM 변화를 감지하고 요약 반환 (Promise 기반)
   */
  waitForDOMChange(timeout: number = 3000): Promise<MutationSummary | null> {
    return new Promise(resolve => {
      let addedNodes = 0;
      let removedNodes = 0;
      let resolved = false;

      const done = () => {
        if (resolved) return;
        resolved = true;
        this.disconnect();

        const currentUrl = window.location.href;
        const hasRouteChange = currentUrl !== this.previousUrl;
        this.previousUrl = currentUrl;

        resolve({
          addedNodes,
          removedNodes,
          hasNewLayer: this.detectNewLayer(),
          hasRouteChange,
          domFingerprint: this.getQuickFingerprint(),
        });
      };

      // Debounce: DOM 변화가 멈춘 후 300ms 대기
      let debounceTimer: ReturnType<typeof setTimeout>;

      this.observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          addedNodes += mutation.addedNodes.length;
          removedNodes += mutation.removedNodes.length;
        }
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(done, 300);
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Timeout 후 변화 없으면 null 반환
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.disconnect();
          if (addedNodes === 0 && removedNodes === 0) {
            resolve(null);
          } else {
            done();
          }
        }
      }, timeout);
    });
  }

  /**
   * 특정 셀렉터의 요소가 나타날 때까지 대기
   */
  waitForElement(selector: string, timeout: number = 3000): Promise<Element | null> {
    return new Promise(resolve => {
      const existing = document.querySelector(selector);
      if (existing) return resolve(existing);

      let resolved = false;
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el && !resolved) {
          resolved = true;
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          observer.disconnect();
          resolve(null);
        }
      }, timeout);
    });
  }

  /**
   * 로딩 인디케이터가 사라질 때까지 대기
   */
  async waitForLoadingComplete(timeout: number = 5000): Promise<void> {
    const loadingSelectors = [
      '.loading', '.spinner', '.skeleton',
      '[class*="loading"]', '[class*="spinner"]',
      '[role="progressbar"]',
    ];

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const loadingEl = document.querySelector(loadingSelectors.join(', '));
      if (!loadingEl || !this.isElementVisible(loadingEl)) {
        return;
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }

  /**
   * 모달/바텀시트 등 새로운 레이어 출현 감지
   */
  detectNewLayer(): boolean {
    const layerSelectors = [
      '[role="dialog"]',
      '[role="alertdialog"]',
      '[class*="modal"]:not([style*="display: none"])',
      '[class*="bottom-sheet"]:not([style*="display: none"])',
      '[class*="popup"]:not([style*="display: none"])',
      '[class*="overlay"]:not([style*="display: none"])',
      '[class*="drawer"]:not([style*="display: none"])',
    ];

    for (const selector of layerSelectors) {
      const el = document.querySelector(selector);
      if (el && this.isElementVisible(el)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 빠른 DOM 지문 생성
   */
  getQuickFingerprint(): string {
    const body = document.body;
    const key = `${body.children.length}|${body.innerHTML.length}|${window.location.href}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(36);
  }

  /**
   * Observer 해제
   */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private isElementVisible(el: Element): boolean {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }
}
