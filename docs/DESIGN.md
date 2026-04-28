# DESIGN — System Architecture & Technical Decisions

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────┐
│                Chrome Extension (MV3)                │
├──────────┬──────────────┬───────────────────────────┤
│ Popup UI │  DevTools    │  Service Worker            │
│ (설정)   │  (향후)      │  - 메시지 라우팅            │
│          │              │  - 스크린샷 캡처            │
│          │              │  - 리포트 다운로드           │
├──────────┴──────────────┴───────────────────────────┤
│               Content Script (ISOLATED)              │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ AceWrapper │  │ DOMTraversal │  │ IssueFilter  │ │
│  └────────────┘  └──────────────┘  └──────────────┘ │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ ElementDet │  │ MutWatcher   │  │ NavManager   │ │
│  └────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────┘
```

## 컴포넌트 상세

### 1. AceWrapper (`src/engine/ace-wrapper.ts`)
- `ace.Checker` 인스턴스 관리
- `scan(target, policies)` → 이슈 목록 + 카운트
- 정책 목록: IBM_Accessibility, WCAG_2_2, WCAG_2_1, WCAG_2_0

### 2. DOMTraversal (`src/crawler/traversal.ts`)
- DFS 재귀 순회 알고리즘
- DOM fingerprint 기반 중복 방문 방지
- Screen 단위 스캔 → ScreenResult 생성
- 에러 시 graceful degradation (해당 요소 skip)

### 3. ElementDetector (`src/crawler/element-detector.ts`)
- 30+ CSS 셀렉터로 인터랙티브 요소 탐지
- 가시성 필터, 제외 패턴 적용
- ThinQ 전용 셀렉터 포함

### 4. MutationWatcher (`src/crawler/mutation-watcher.ts`)
- MutationObserver + debounce (300ms)
- 모달/바텀시트 출현 감지
- 로딩 인디케이터 완료 대기
- SPA 라우팅 변화 감지

### 5. NavigationManager (`src/crawler/navigation.ts`)
- 4단계 레이어 닫기 전략: ESC → 닫기 버튼 → 오버레이 → history.back()
- 상태 복구 메커니즘

### 6. IssueFilter (`src/filter/regex-filter.ts`)
- 정규표현식 멀티 키워드 매칭
- `exclude` (리포트 제외) / `flag` (플래그 표시) 두 가지 액션
- ruleId 범위 제한 지원

## 메시지 프로토콜

| 방향 | 메시지 | 설명 |
|------|--------|------|
| Popup → SW | `startScan`, `stopScan`, `exportJSON`, `exportMarkdown` | 사용자 액션 |
| SW → Content | `START_SCAN`, `STOP_SCAN` | 스캔 제어 |
| Content → SW | `CAPTURE_SCREENSHOT`, `SCAN_PROGRESS`, `SCAN_COMPLETE`, `SCAN_ERROR` | 결과 전달 |
| SW → Popup | `status`, `config`, `report` | 상태 업데이트 |

## 데이터 스키마

`FullReport` → `ScreenResult[]` → `ClassifiedIssue[]`

Polarion ALM 연동 시 `ClassifiedIssue` → Polarion Defect Work Item 매핑 예정.
