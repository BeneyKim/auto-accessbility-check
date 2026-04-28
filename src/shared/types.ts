/**
 * LG ThinQ A11y Checker — Shared Type Definitions
 * 전체 프로젝트에서 공유되는 타입 인터페이스
 */

// ─── ACE Engine Types ────────────────────────────────────────
export interface AceReport {
  results: AceIssue[];
  numExecuted: number;
  nls: Record<string, Record<string, string>>;
  summary: {
    URL: string;
    counts: IssueCounts;
    scanTime: number;
    ruleArchive: string;
    policies: string[];
    reportLevels: string[];
    startScan: number;
  };
}

export interface AceIssue {
  ruleId: string;
  reasonId: string;
  value: [string, string]; // [category, result] e.g. ["VIOLATION", "FAIL"]
  path: {
    dom: string;
    aria: string;
  };
  ruleTime: number;
  message: string;
  messageArgs: string[];
  apiArgs: string[];
  bounds: ElementBounds;
  snippet: string;
  category: string;
  ignored: boolean;
  level: IssueLevel;
}

export type IssueLevel =
  | 'violation'
  | 'potentialviolation'
  | 'recommendation'
  | 'potentialrecommendation'
  | 'manual'
  | 'pass';

export interface IssueCounts {
  violation: number;
  potentialviolation: number;
  recommendation: number;
  potentialrecommendation: number;
  manual: number;
  pass: number;
  ignored: number;
}

export interface ElementBounds {
  left: number;
  top: number;
  height: number;
  width: number;
}

// ─── Scan Configuration ──────────────────────────────────────
export interface ScanConfig {
  policies: string[];
  reportLevels: IssueLevel[];
  maxDepth: number;
  animationWaitMs: number;
  mutationTimeoutMs: number;
  maxElementsPerScreen: number;
  selectedProduct?: string;
  waiverRules: WaiverRule[];
}

export const DEFAULT_SCAN_CONFIG: ScanConfig = {
  policies: ['IBM_Accessibility'],
  reportLevels: ['violation', 'potentialviolation', 'recommendation', 'potentialrecommendation', 'manual'],
  maxDepth: 5,
  animationWaitMs: 1000,
  mutationTimeoutMs: 3000,
  maxElementsPerScreen: 100,
  waiverRules: [],
};

// ─── Waiver Filter ───────────────────────────────────────────
export interface WaiverRule {
  id: string;
  pattern: string;       // regex pattern string
  ruleIds?: string[];    // optional: only apply to specific ACE rule IDs
  action: 'exclude' | 'flag';
  reason: string;
}

export type FilterStatus = 'active' | 'waived' | 'flagged';

// ─── Classified Issue (extended ACE issue) ───────────────────
export interface ClassifiedIssue {
  ruleId: string;
  reasonId: string;
  level: IssueLevel;
  message: string;
  xpath: string;
  ariaPath: string;
  snippet: string;
  bounds: ElementBounds;
  wcagCriteria?: string;
  filterStatus: FilterStatus;
  waiverRuleId?: string;
}

// ─── Screen Result ───────────────────────────────────────────
export interface ScreenResult {
  id: string;
  name: string;
  path: string[];         // click sequence to reach this screen
  depth: number;
  url: string;
  screenshotDataUrl: string;
  timestamp: string;
  issues: ClassifiedIssue[];
  issueSummary: IssueCounts;
  domFingerprint: string;
}

// ─── Full Report ─────────────────────────────────────────────
export interface FullReport {
  metadata: ReportMetadata;
  screens: ScreenResult[];
  summary: ReportSummary;
}

export interface ReportMetadata {
  productName: string;
  executionTime: {
    start: string;
    end: string;
    durationMs: number;
  };
  environment: {
    browser: string;
    extensionVersion: string;
    aceVersion: string;
    policies: string[];
  };
  scanConfig: ScanConfig;
}

export interface ReportSummary {
  totalScreens: number;
  totalIssues: IssueCounts;
  filteredCount: number;
  flaggedCount: number;
  topViolations: Array<{
    ruleId: string;
    count: number;
    message: string;
  }>;
}

// ─── Message Protocol (Content Script ↔ Service Worker) ──────
export type ExtensionMessage =
  | { type: 'START_SCAN'; payload: ScanConfig }
  | { type: 'STOP_SCAN'; payload: undefined }
  | { type: 'SCAN_PROGRESS'; payload: ScanProgress }
  | { type: 'SCAN_SCREEN_RESULT'; payload: ScreenResult }
  | { type: 'SCAN_COMPLETE'; payload: FullReport }
  | { type: 'SCAN_ERROR'; payload: { message: string; screen?: string } }
  | { type: 'CAPTURE_SCREENSHOT'; payload: undefined }
  | { type: 'SCREENSHOT_RESULT'; payload: { dataUrl: string } }
  | { type: 'GET_CONFIG'; payload: undefined }
  | { type: 'CONFIG_RESULT'; payload: ScanConfig };

export interface ScanProgress {
  currentScreen: number;
  totalScreens: number;
  currentDepth: number;
  screenName: string;
  issuesFound: number;
  status: 'scanning' | 'crawling' | 'waiting' | 'complete' | 'error' | 'stopped';
}

// ─── Crawler State ───────────────────────────────────────────
export interface CrawlerState {
  visitedFingerprints: Set<string>;
  currentPath: string[];
  currentDepth: number;
  screensScanned: number;
  totalIssuesFound: number;
  isRunning: boolean;
}

export interface InteractiveElement {
  element: Element;
  selector: string;
  xpath: string;
  label: string;        // text content or aria-label
  type: string;          // tag + role
  fingerprint: string;   // unique identifier
}
