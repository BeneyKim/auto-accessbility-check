/**
 * ACE Engine Wrapper
 * IBM accessibility-checker-engine (ace.js)를 Content Script에서 사용하기 위한 래퍼
 * 
 * ace.js는 IIFE 번들로 전역 `ace` 객체를 노출합니다.
 * side-effect import를 통해 번들러가 ace.js를 포함시키도록 합니다.
 */

// Side-effect import: ace.js가 전역 `ace`를 선언함
import 'accessibility-checker-engine';

import type { AceReport, AceIssue, IssueCounts, IssueLevel } from '@shared/types';

// ace.js가 전역에 노출하는 타입
declare const ace: {
  Checker: new () => {
    check: (doc: Document | Element, policies: string[]) => Promise<AceReport>;
  };
};

export class AceWrapper {
  private checker: InstanceType<typeof ace.Checker> | null = null;
  private initialized = false;

  /**
   * ACE 엔진 초기화 (ace.js가 로드된 후 호출)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // ace.js가 전역에 로드되었는지 확인
    if (typeof ace === 'undefined' || !ace.Checker) {
      throw new Error(
        'ACE engine (ace.js) is not loaded. ' +
        'Ensure accessibility-checker-engine is properly bundled.'
      );
    }

    this.checker = new ace.Checker();
    this.initialized = true;
    console.log('[AceWrapper] ACE engine initialized successfully');
  }

  /**
   * 지정된 DOM 대상에 접근성 스캔 실행
   */
  async scan(
    target: Document | Element,
    policies: string[] = ['IBM_Accessibility']
  ): Promise<{
    issues: AceIssue[];
    summary: IssueCounts;
    scanTime: number;
    numExecuted: number;
  }> {
    if (!this.checker) {
      await this.initialize();
    }

    const startTime = Date.now();
    const report = await this.checker!.check(target, policies);
    const scanTime = Date.now() - startTime;

    // Pass 결과는 제외하고 실제 이슈만 필터
    const issues = report.results.filter(
      (result: AceIssue) => result.level !== 'pass' && !result.ignored
    );

    const summary = this.countIssues(issues);

    console.log(`[AceWrapper] Scan complete: ${issues.length} issues found in ${scanTime}ms`);

    return {
      issues,
      summary,
      scanTime,
      numExecuted: report.numExecuted,
    };
  }

  /**
   * 사용 가능한 정책 목록 반환
   */
  getAvailablePolicies(): string[] {
    return [
      'IBM_Accessibility',
      'WCAG_2_2',
      'WCAG_2_1',
      'WCAG_2_0',
    ];
  }

  /**
   * 이슈 카운트 집계
   */
  private countIssues(issues: AceIssue[]): IssueCounts {
    const counts: IssueCounts = {
      violation: 0,
      potentialviolation: 0,
      recommendation: 0,
      potentialrecommendation: 0,
      manual: 0,
      pass: 0,
      ignored: 0,
    };

    for (const issue of issues) {
      const level = issue.level as keyof IssueCounts;
      if (level in counts) {
        counts[level]++;
      }
    }

    return counts;
  }

  /**
   * ACE 이슈를 ClassifiedIssue 형태로 변환 (필터 적용 전)
   */
  static toClassifiedIssue(issue: AceIssue): import('@shared/types').ClassifiedIssue {
    return {
      ruleId: issue.ruleId,
      reasonId: issue.reasonId,
      level: issue.level as Exclude<IssueLevel, 'pass'>,
      message: issue.message,
      xpath: issue.path.dom,
      ariaPath: issue.path.aria,
      snippet: issue.snippet,
      bounds: issue.bounds,
      filterStatus: 'active',
    };
  }
}
