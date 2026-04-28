/**
 * Popup Script — UI 로직
 */

// ─── DOM Elements ────────────────────────────────────────────
const $ = (id: string) => document.getElementById(id)!;

const statusBar = $('status-bar');
const statusIcon = $('status-icon');
const statusText = $('status-text');
const policySelect = $('policy-select') as HTMLSelectElement;
const productName = $('product-name') as HTMLInputElement;
const maxDepth = $('max-depth') as HTMLInputElement;
const animWait = $('anim-wait') as HTMLInputElement;
const waiverRulesInput = $('waiver-rules') as HTMLTextAreaElement;
const btnApplyWaiver = $('btn-apply-waiver');
const progressSection = $('progress-section');
const progressBar = $('progress-bar');
const statScreens = $('stat-screens');
const statDepth = $('stat-depth');
const statIssues = $('stat-issues');
const progressScreenName = $('progress-screen-name');
const btnStart = $('btn-start');
const btnStop = $('btn-stop');
const exportSection = $('export-section');
const btnExportJson = $('btn-export-json');
const btnExportMd = $('btn-export-md');

// ─── Port Connection ─────────────────────────────────────────
const port = chrome.runtime.connect({ name: 'popup' });

// ─── Event Listeners ─────────────────────────────────────────
btnStart.addEventListener('click', () => {
  const config = {
    policies: [policySelect.value],
    selectedProduct: productName.value || undefined,
    maxDepth: parseInt(maxDepth.value, 10),
    animationWaitMs: parseInt(animWait.value, 10),
  };
  port.postMessage({ action: 'updateConfig', payload: config });
  port.postMessage({ action: 'startScan' });

  setUIState('scanning');
});

btnStop.addEventListener('click', () => {
  port.postMessage({ action: 'stopScan' });
  setUIState('stopped');
});

btnApplyWaiver.addEventListener('click', () => {
  try {
    const rules = JSON.parse(waiverRulesInput.value || '[]');
    port.postMessage({ action: 'updateConfig', payload: { waiverRules: rules } });
    btnApplyWaiver.textContent = '✓ 적용됨';
    setTimeout(() => { btnApplyWaiver.textContent = '규칙 적용'; }, 1500);
  } catch {
    btnApplyWaiver.textContent = '❌ JSON 오류';
    setTimeout(() => { btnApplyWaiver.textContent = '규칙 적용'; }, 1500);
  }
});

btnExportJson.addEventListener('click', () => {
  port.postMessage({ action: 'exportJSON' });
});

btnExportMd.addEventListener('click', () => {
  port.postMessage({ action: 'exportMarkdown' });
});

// ─── Message Handler ─────────────────────────────────────────
port.onMessage.addListener((msg: { action: string; payload?: any }) => {
  switch (msg.action) {
    case 'status':
      if (msg.payload) updateProgress(msg.payload);
      break;

    case 'config':
      if (msg.payload) loadConfig(msg.payload);
      break;

    case 'scanStarted':
      setUIState('scanning');
      break;

    case 'scanStopped':
      setUIState('stopped');
      break;
  }
});

// ─── UI State Management ─────────────────────────────────────
function setUIState(state: 'idle' | 'scanning' | 'complete' | 'error' | 'stopped') {
  statusBar.className = `status-bar status-${state === 'stopped' ? 'idle' : state}`;

  const icons: Record<string, string> = {
    idle: '⏸', scanning: '🔍', complete: '✅', error: '❌', stopped: '⏹',
  };
  const texts: Record<string, string> = {
    idle: '대기 중', scanning: '검사 중...', complete: '검사 완료',
    error: '오류 발생', stopped: '검사 중지됨',
  };

  statusIcon.textContent = icons[state] || '⏸';
  statusText.textContent = texts[state] || '대기 중';

  btnStart.classList.toggle('hidden', state === 'scanning');
  btnStop.classList.toggle('hidden', state !== 'scanning');
  progressSection.classList.toggle('hidden', state === 'idle');
  exportSection.classList.toggle('hidden', state !== 'complete');
}

function updateProgress(progress: {
  currentScreen: number;
  currentDepth: number;
  issuesFound: number;
  screenName: string;
  status: string;
}) {
  statScreens.textContent = String(progress.currentScreen);
  statDepth.textContent = String(progress.currentDepth);
  statIssues.textContent = String(progress.issuesFound);
  progressScreenName.textContent = progress.screenName;

  // 진행률 바 (화면 수 기반 추정)
  const pct = Math.min(progress.currentScreen * 10, 95);
  progressBar.style.width = `${pct}%`;

  if (progress.status === 'complete') {
    progressBar.style.width = '100%';
    setUIState('complete');
  } else if (progress.status === 'error') {
    setUIState('error');
  }
}

function loadConfig(config: any) {
  if (config.policies?.[0]) policySelect.value = config.policies[0];
  if (config.selectedProduct) productName.value = config.selectedProduct;
  if (config.maxDepth) maxDepth.value = String(config.maxDepth);
  if (config.animationWaitMs) animWait.value = String(config.animationWaitMs);
  if (config.waiverRules?.length) {
    waiverRulesInput.value = JSON.stringify(config.waiverRules, null, 2);
  }
}

// ─── Init ────────────────────────────────────────────────────
port.postMessage({ action: 'getConfig' });
port.postMessage({ action: 'getStatus' });
