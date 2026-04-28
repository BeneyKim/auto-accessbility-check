/**
 * Interactive Element Detector
 * SPA 내 인터랙티브 요소를 탐지하여 크롤링 대상 목록 생성
 */

import type { InteractiveElement } from '@shared/types';
import { getXPath, getElementLabel, getSelector } from '@shared/utils';

/** 인터랙티브 요소 탐지 CSS 셀렉터 */
const INTERACTIVE_SELECTORS = [
  'button:not([disabled]):not([aria-hidden="true"])',
  'a[href]:not([aria-hidden="true"])',
  '[role="button"]:not([disabled])',
  '[role="tab"]:not([aria-disabled="true"])',
  '[role="menuitem"]',
  '[role="switch"]',
  '[role="slider"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="link"]',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])',
  '[onclick]',
  // ThinQ 전용 셀렉터
  '[class*="clickable"]',
  '[class*="btn"]:not(button)',
  '[class*="toggle"]',
  '[class*="card"][class*="device"]',
].join(', ');

/** 크롤링에서 제외할 요소 패턴 */
const EXCLUDE_PATTERNS = [
  /^(header|footer|nav)$/i,         // 네비게이션 영역 내 반복 링크
  /logo/i,
  /^#$/,                              // href="#" 링크
  /javascript:void/i,
];

export class ElementDetector {
  private processedFingerprints: Set<string> = new Set();

  /**
   * 현재 DOM에서 인터랙티브 요소 목록 수집 (Shadow DOM 포함)
   */
  detect(root: Element | Document = document): InteractiveElement[] {
    const rawElements = this.querySelectorAllDeep(root, INTERACTIVE_SELECTORS);
    const results: InteractiveElement[] = [];

    for (const element of rawElements) {
      // 보이지 않는 요소 제외
      if (!this.isVisible(element)) continue;

      // 이미 처리한 요소 제외
      const fingerprint = this.createFingerprint(element);
      if (this.processedFingerprints.has(fingerprint)) continue;

      // 제외 패턴 체크
      if (this.shouldExclude(element)) continue;

      results.push({
        element,
        selector: getSelector(element),
        xpath: getXPath(element),
        label: getElementLabel(element),
        type: this.getElementType(element),
        fingerprint,
      });
    }

    return results;
  }

  /**
   * 요소 방문 기록
   */
  markVisited(fingerprint: string): void {
    this.processedFingerprints.add(fingerprint);
  }

  /**
   * 방문 기록 초기화
   */
  reset(): void {
    this.processedFingerprints.clear();
  }

  /**
   * Shadow DOM을 통과하여 모든 요소를 재귀적으로 탐색
   */
  private querySelectorAllDeep(root: Element | Document | ShadowRoot, selector: string): Element[] {
    const results: Element[] = [];
    
    // 현재 root 내에서 매칭되는 요소 찾기
    const elements = root.querySelectorAll(selector);
    results.push(...Array.from(elements));
    
    // 모든 하위 요소를 순회하며 shadowRoot가 있는 경우 재귀 탐색
    const allNodes = root.querySelectorAll('*');
    for (const node of allNodes) {
      if (node.shadowRoot) {
        results.push(...this.querySelectorAllDeep(node.shadowRoot, selector));
      }
    }
    
    return results;
  }

  /**
   * 요소 가시성 확인
   */
  private isVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    return true;
  }

  /**
   * 요소 고유 식별자 생성
   */
  private createFingerprint(element: Element): string {
    const tag = element.tagName.toLowerCase();
    const text = (element.textContent || '').trim().substring(0, 30);
    const xpath = getXPath(element);
    const raw = `${tag}|${text}|${xpath}`;
    // Simple hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(36);
  }

  /**
   * 제외 대상 여부 확인
   */
  private shouldExclude(element: Element): boolean {
    const href = element.getAttribute('href');
    if (href) {
      for (const pattern of EXCLUDE_PATTERNS) {
        if (pattern.test(href)) return true;
      }
    }
    return false;
  }

  /**
   * 요소 유형 문자열 생성
   */
  private getElementType(element: Element): string {
    const tag = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    return role ? `${tag}[role=${role}]` : tag;
  }
}
