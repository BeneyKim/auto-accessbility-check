/**
 * Regex-based Issue Filter
 * 사내 Waiver(예외 처리) 정책을 반영한 이슈 필터링
 */

import type { ClassifiedIssue, WaiverRule, FilterStatus } from '@shared/types';

export interface FilteredResult {
  activeIssues: ClassifiedIssue[];
  waivedIssues: ClassifiedIssue[];
  flaggedIssues: ClassifiedIssue[];
  stats: {
    total: number;
    active: number;
    waived: number;
    flagged: number;
  };
}

export class IssueFilter {
  private rules: Array<WaiverRule & { compiledPattern: RegExp }>;

  constructor(rules: WaiverRule[]) {
    this.rules = rules.map(rule => ({
      ...rule,
      compiledPattern: new RegExp(rule.pattern, 'i'),
    }));
  }

  /**
   * 이슈 목록에 Waiver 규칙 적용
   */
  apply(issues: ClassifiedIssue[]): FilteredResult {
    const activeIssues: ClassifiedIssue[] = [];
    const waivedIssues: ClassifiedIssue[] = [];
    const flaggedIssues: ClassifiedIssue[] = [];

    for (const issue of issues) {
      const matchedRule = this.findMatchingRule(issue);

      if (matchedRule) {
        const updatedIssue: ClassifiedIssue = {
          ...issue,
          filterStatus: matchedRule.action === 'exclude' ? 'waived' : 'flagged',
          waiverRuleId: matchedRule.id,
        };

        if (matchedRule.action === 'exclude') {
          waivedIssues.push(updatedIssue);
        } else {
          flaggedIssues.push(updatedIssue);
        }
      } else {
        activeIssues.push(issue);
      }
    }

    return {
      activeIssues,
      waivedIssues,
      flaggedIssues,
      stats: {
        total: issues.length,
        active: activeIssues.length,
        waived: waivedIssues.length,
        flagged: flaggedIssues.length,
      },
    };
  }

  /**
   * 이슈에 매칭되는 첫 번째 Waiver 규칙 탐색
   */
  private findMatchingRule(issue: ClassifiedIssue): (WaiverRule & { compiledPattern: RegExp }) | null {
    for (const rule of this.rules) {
      // ruleId 필터가 있으면 해당 ruleId만 매칭
      if (rule.ruleIds && rule.ruleIds.length > 0) {
        if (!rule.ruleIds.includes(issue.ruleId)) continue;
      }

      // 정규표현식으로 메시지 매칭
      if (rule.compiledPattern.test(issue.message)) {
        return rule;
      }

      // snippet에서도 매칭 시도
      if (rule.compiledPattern.test(issue.snippet)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * 필터 규칙 업데이트
   */
  updateRules(rules: WaiverRule[]): void {
    this.rules = rules.map(rule => ({
      ...rule,
      compiledPattern: new RegExp(rule.pattern, 'i'),
    }));
  }

  /**
   * 현재 규칙 목록 반환
   */
  getRules(): WaiverRule[] {
    return this.rules.map(({ compiledPattern, ...rule }) => rule);
  }
}
