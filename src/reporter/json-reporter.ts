/**
 * JSON Reporter — 구조화된 JSON 리포트 생성
 */

import type { FullReport, ScreenResult, ReportMetadata, ReportSummary, IssueCounts } from '@shared/types';

export class JsonReporter {
  /**
   * 전체 리포트 생성
   */
  generate(
    screens: ScreenResult[],
    metadata: ReportMetadata
  ): FullReport {
    const summary = this.buildSummary(screens);

    return {
      metadata,
      screens,
      summary,
    };
  }

  /**
   * 요약 통계 생성
   */
  private buildSummary(screens: ScreenResult[]): ReportSummary {
    const totalIssues: IssueCounts = {
      violation: 0,
      potentialviolation: 0,
      recommendation: 0,
      potentialrecommendation: 0,
      manual: 0,
      pass: 0,
      ignored: 0,
    };

    let filteredCount = 0;
    let flaggedCount = 0;
    const ruleCounter = new Map<string, { count: number; message: string }>();

    for (const screen of screens) {
      for (const issue of screen.issues) {
        // 카운트 집계
        if (issue.level in totalIssues) {
          totalIssues[issue.level as keyof IssueCounts]++;
        }

        // 필터 상태 집계
        if (issue.filterStatus === 'waived') filteredCount++;
        if (issue.filterStatus === 'flagged') flaggedCount++;

        // 룰별 카운터
        const existing = ruleCounter.get(issue.ruleId);
        if (existing) {
          existing.count++;
        } else {
          ruleCounter.set(issue.ruleId, { count: 1, message: issue.message });
        }
      }
    }

    // 상위 위반 룰 정렬
    const topViolations = Array.from(ruleCounter.entries())
      .map(([ruleId, data]) => ({ ruleId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalScreens: screens.length,
      totalIssues,
      filteredCount,
      flaggedCount,
      topViolations,
    };
  }

  /**
   * JSON 문자열로 직렬화 (스크린샷은 별도 처리 옵션)
   */
  serialize(report: FullReport, includeScreenshots = true): string {
    if (!includeScreenshots) {
      const stripped = {
        ...report,
        screens: report.screens.map(s => ({
          ...s,
          screenshotDataUrl: '[omitted]',
        })),
      };
      return JSON.stringify(stripped, null, 2);
    }
    return JSON.stringify(report, null, 2);
  }
}
