import { describe, it, expect, beforeEach } from 'vitest';
import { IssueFilter } from './regex-filter';
import type { ClassifiedIssue } from '@shared/types';

describe('IssueFilter', () => {
  let filter: IssueFilter;

  beforeEach(() => {
    filter = new IssueFilter([]);
    filter.updateRules([
      {
        id: '1',
        pattern: 'aria-hidden',
        ruleIds: ['aria_hidden_focus'],
        action: 'exclude',
        reason: 'Known issue with third-party widget'
      },
      {
        id: '2',
        pattern: 'color contrast',
        ruleIds: [],
        action: 'flag',
        reason: 'Design team review needed'
      }
    ]);
  });

  it('should pass issues that do not match any filter', () => {
    const issue: ClassifiedIssue = {
      ruleId: 'image_alt_text',
      reasonId: 'pass_1',
      level: 'violation',
      message: 'Image has no alt attribute',
      xpath: '/html/body/img',
      ariaPath: '',
      snippet: '<img>',
      bounds: { left: 0, top: 0, height: 10, width: 10 },
      filterStatus: 'active'
    };

    const result = filter.apply([issue]);
    expect(result.activeIssues.length).toBe(1);
    expect(result.waivedIssues.length).toBe(0);
  });

  it('should exclude issues matching exclude rules', () => {
    const issue: ClassifiedIssue = {
      ruleId: 'aria_hidden_focus',
      reasonId: 'fail_1',
      level: 'violation',
      message: 'Element with aria-hidden="true" is focusable',
      xpath: '/html/body/div',
      ariaPath: '',
      snippet: '<div aria-hidden="true" tabindex="0">',
      bounds: { left: 0, top: 0, height: 10, width: 10 },
      filterStatus: 'active'
    };

    const result = filter.apply([issue]);
    expect(result.activeIssues.length).toBe(0);
    expect(result.waivedIssues.length).toBe(1);
  });

  it('should flag issues matching flag rules', () => {
    const issue: ClassifiedIssue = {
      ruleId: 'color_contrast_minimum',
      reasonId: 'fail_1',
      level: 'potentialviolation',
      message: 'Low color contrast ratio',
      xpath: '/html/body/p',
      ariaPath: '',
      snippet: '<p style="color: #ccc; background: #fff;">',
      bounds: { left: 0, top: 0, height: 10, width: 10 },
      filterStatus: 'active'
    };

    const result = filter.apply([issue]);
    expect(result.flaggedIssues.length).toBe(1);
    expect(result.flaggedIssues[0].filterStatus).toBe('flagged');
  });

  it('should return statistics correctly', () => {
    const issues: ClassifiedIssue[] = [
      { ruleId: 'image_alt', reasonId: '', level: 'violation', message: 'test', xpath: '', ariaPath: '', snippet: '', bounds: {left:0,top:0,width:0,height:0}, filterStatus: 'active' }, // active
      { ruleId: 'aria_hidden_focus', reasonId: '', level: 'violation', message: 'aria-hidden', xpath: '', ariaPath: '', snippet: '', bounds: {left:0,top:0,width:0,height:0}, filterStatus: 'active' }, // excluded
      { ruleId: 'color_contrast', reasonId: '', level: 'violation', message: 'color contrast', xpath: '', ariaPath: '', snippet: '', bounds: {left:0,top:0,width:0,height:0}, filterStatus: 'active' }, // flagged
    ];

    const result = filter.apply(issues);

    expect(result.stats.total).toBe(3);
    expect(result.stats.waived).toBe(1);
    expect(result.stats.flagged).toBe(1);
    expect(result.stats.active).toBe(1);
  });
});
