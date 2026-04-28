# LG ThinQ A11y Checker — Chrome & Edge Extension

> IBM Accessibility Checker Engine(ACE v4) 기반 LG ThinQ Web 접근성 자동 검사 도구

## 📋 개요

LG ThinQ Web(`https://my.lgthinq.com`)의 제품 제어 화면에서 모든 인터랙티브 요소를 자동으로 순회하며 접근성 이슈를 탐지하는 확장 프로그램(Chrome 및 Microsoft Edge 완벽 지원)입니다.

### 주요 기능
- **IBM ACE 엔진 통합**: `accessibility-checker-engine` v4 기반 자동 스캔
- **SPA 크롤링**: MutationObserver 기반 동적 DOM 변화 감지 및 DFS 순회
- **Waiver 필터링**: 정규표현식 기반 사내 예외 정책 적용
- **리포트 생성**: JSON / Markdown 형식 구조화 리포트 출력
- **스크린샷 캡처**: 각 화면별 자동 스크린샷 저장

## 🚀 설치 및 사용법

### 개발 환경 설정
```bash
# 의존성 설치
npm install

# 개발 빌드 (HMR 지원)
npm run dev

# 프로덕션 빌드
npm run build
```

### 브라우저에 로드 (Chrome / Edge 공통)
Microsoft Edge와 Chrome 모두 Chromium 기반이므로 동일한 방법으로 사용할 수 있습니다.

#### Chrome
1. Chrome에서 `chrome://extensions` 접속
2. **개발자 모드** 활성화 (우측 상단)
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. 프로젝트의 `dist` 디렉터리 선택

#### Microsoft Edge
1. Edge에서 `edge://extensions` 접속
2. **개발자 모드** 활성화 (좌측 하단 메뉴)
3. **압축 풀린 확장 로드** 클릭
4. 프로젝트의 `dist` 디렉터리 선택

### 사용 방법
1. `https://my.lgthinq.com`에 **수동 로그인**
2. 검사할 제품의 제어 화면으로 이동
3. Extension 아이콘 클릭 → Popup UI 오픈
4. 정책(Policy), 제품명, 최대 Depth 설정
5. **검사 시작** 버튼 클릭
6. 검사 완료 후 **JSON** 또는 **Markdown** 리포트 내보내기

## 📁 프로젝트 구조

```
src/
├── background/        # Service Worker (메시지 라우팅, 스크린샷, 다운로드)
├── content/           # Content Script (ACE 구동, 크롤링 오케스트레이션)
├── engine/            # ACE 엔진 래퍼
├── crawler/           # DOM 순회, 요소 탐지, MutationObserver, 내비게이션
├── filter/            # Regex 기반 Waiver 필터
├── reporter/          # JSON / Markdown 리포트 생성
├── popup/             # Popup UI (HTML, CSS, JS)
└── shared/            # 공유 타입 정의, 유틸리티
```

## ⚙️ 설정 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| Policy | IBM_Accessibility | 적용할 접근성 정책 |
| Max Depth | 5 | 크롤링 최대 깊이 |
| Animation Wait | 1000ms | 애니메이션 완료 대기 시간 |
| Mutation Timeout | 3000ms | DOM 변화 감지 타임아웃 |
| Max Elements | 100 | 화면당 최대 탐색 요소 수 |

## 📄 라이선스

이 프로젝트는 사내 전용 도구입니다.

IBM Accessibility Checker Engine은 [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)에 따라 사용됩니다.
자세한 내용은 `THIRD_PARTY_LICENSES.md`를 참조하세요.
