/**
 * Navigation Manager — Depth 복귀 전략
 * 모달 닫기, 뒤로가기 등 크롤링 Depth 복귀를 관리
 */

import { delay } from '@shared/utils';

export class NavigationManager {
  /**
   * 현재 레이어(모달, 바텀시트 등) 닫기 시도
   * 여러 전략을 순차적으로 시도
   */
  async closeCurrentLayer(): Promise<boolean> {
    // 전략 1: ESC 키
    if (await this.tryEscKey()) return true;

    // 전략 2: 닫기 버튼 클릭
    if (await this.tryCloseButton()) return true;

    // 전략 3: 오버레이 배경 클릭
    if (await this.tryOverlayClick()) return true;

    // 전략 4: history.back()
    if (await this.tryHistoryBack()) return true;

    return false;
  }

  /**
   * ESC 키 이벤트 발생
   */
  private async tryEscKey(): Promise<boolean> {
    const before = this.getLayerCount();
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
    }));

    await delay(500);
    return this.getLayerCount() < before;
  }

  /**
   * 닫기 버튼 탐색 후 클릭
   */
  private async tryCloseButton(): Promise<boolean> {
    const closeSelectors = [
      'button[aria-label*="close" i]',
      'button[aria-label*="닫기"]',
      'button[class*="close"]',
      'button[class*="cancel"]',
      '[role="dialog"] button:first-of-type',
      '.modal-close',
      '.btn-close',
      '[class*="bottom-sheet"] button[class*="close"]',
    ];

    for (const selector of closeSelectors) {
      const btn = document.querySelector(selector);
      if (btn && btn instanceof HTMLElement) {
        const before = this.getLayerCount();
        btn.click();
        await delay(500);
        if (this.getLayerCount() < before) return true;
      }
    }

    return false;
  }

  /**
   * 오버레이 배경 클릭
   */
  private async tryOverlayClick(): Promise<boolean> {
    const overlaySelectors = [
      '.modal-backdrop',
      '.overlay',
      '[class*="backdrop"]',
      '[class*="overlay"]:not([role="dialog"])',
    ];

    for (const selector of overlaySelectors) {
      const overlay = document.querySelector(selector);
      if (overlay && overlay instanceof HTMLElement) {
        const before = this.getLayerCount();
        overlay.click();
        await delay(500);
        if (this.getLayerCount() < before) return true;
      }
    }

    return false;
  }

  /**
   * 브라우저 뒤로가기
   */
  private async tryHistoryBack(): Promise<boolean> {
    const beforeUrl = window.location.href;
    window.history.back();
    await delay(800);
    return window.location.href !== beforeUrl;
  }

  /**
   * 현재 열린 레이어(모달/다이얼로그) 수 카운트
   */
  private getLayerCount(): number {
    const selectors = [
      '[role="dialog"]:not([aria-hidden="true"])',
      '[role="alertdialog"]:not([aria-hidden="true"])',
      '[class*="modal"]:not([style*="display: none"])',
      '[class*="bottom-sheet"]:not([style*="display: none"])',
    ];

    let count = 0;
    for (const selector of selectors) {
      count += document.querySelectorAll(selector).length;
    }
    return count;
  }
}
