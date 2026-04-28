# TEST — 테스트 계획 및 결과

## 테스트 전략

### 1. 단위 테스트 (Vitest)

| 모듈 | 테스트 항목 | 상태 |
|------|------------|------|
| `IssueFilter` | regex 매칭, exclude/flag 분류, ruleId 필터 | ⏳ 대기 |
| `AceWrapper` | scan 결과 파싱, 카운트 집계, toClassifiedIssue 변환 | ⏳ 대기 |
| `JsonReporter` | 요약 통계 계산, topViolations 정렬, serialize 옵션 | ⏳ 대기 |
| `MarkdownReporter` | 헤더/요약/화면 섹션 생성, level 뱃지 | ⏳ 대기 |
| `ElementDetector` | 가시성 필터, fingerprint 생성, 제외 패턴 | ⏳ 대기 |
| `utils` | getXPath, getDOMFingerprint, getElementLabel | ⏳ 대기 |

### 2. 통합 테스트

| 시나리오 | 설명 | 상태 |
|----------|------|------|
| 단일 페이지 스캔 | 정적 HTML → ACE 스캔 → JSON 출력 검증 | ⏳ 대기 |
| 메시지 프로토콜 | Content ↔ SW 메시지 라운드트립 | ⏳ 대기 |
| 스크린샷 캡처 | captureVisibleTab 호출 및 Base64 반환 | ⏳ 대기 |

### 3. E2E 테스트 (수동)

| 시나리오 | 설명 | 상태 |
|----------|------|------|
| ThinQ 로그인 후 스캔 | 수동 로그인 → 에어컨 화면 → 스캔 시작 | ⏳ 대기 |
| 모달 순회 | 바텀시트 열기 → 스캔 → 닫기 → 복귀 | ⏳ 대기 |
| 리포트 내보내기 | JSON/MD 다운로드 → 내용 정합성 검증 | ⏳ 대기 |
| Waiver 필터 | 규칙 설정 → 스캔 → 필터된 결과 확인 | ⏳ 대기 |

## 테스트 결과 기록

> Phase 5에서 테스트 실행 후 업데이트 예정.
