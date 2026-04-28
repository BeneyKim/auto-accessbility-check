/**
 * Shared utility functions
 */

/** Generate a unique ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Get XPath for a DOM element */
export function getXPath(element: Element): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling: Element | null = current.previousElementSibling;
    while (sibling) {
      if (sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }
    const tagName = current.nodeName.toLowerCase();
    parts.unshift(`${tagName}[${index}]`);
    current = current.parentElement;
  }

  return `/${parts.join('/')}`;
}

/** Create a DOM fingerprint (hash of outerHTML structure) */
export function getDOMFingerprint(root: Element = document.documentElement): string {
  const structure = extractStructure(root, 3);
  return simpleHash(structure);
}

function extractStructure(element: Element, maxDepth: number, depth = 0): string {
  if (depth >= maxDepth) return '';
  const tag = element.tagName.toLowerCase();
  const classes = element.className ? `.${element.className.toString().split(/\s+/).sort().join('.')}` : '';
  const childStructures = Array.from(element.children)
    .map(child => extractStructure(child, maxDepth, depth + 1))
    .join(',');
  return `${tag}${classes}(${childStructures})`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

/** Get a human-readable label for an element */
export function getElementLabel(element: Element): string {
  return (
    element.getAttribute('aria-label') ||
    element.getAttribute('title') ||
    element.textContent?.trim().substring(0, 50) ||
    element.getAttribute('id') ||
    element.tagName.toLowerCase()
  );
}

/** Get a CSS selector for an element */
export function getSelector(element: Element): string {
  if (element.id) return `#${element.id}`;
  
  const tag = element.tagName.toLowerCase();
  const classes = Array.from(element.classList).join('.');
  const parent = element.parentElement;
  
  if (classes) {
    const selector = `${tag}.${classes}`;
    if (parent && parent.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }
  
  if (parent) {
    const siblings = Array.from(parent.children).filter(c => c.tagName === element.tagName);
    const index = siblings.indexOf(element);
    return `${getSelector(parent)} > ${tag}:nth-of-type(${index + 1})`;
  }
  
  return tag;
}

/** Wait for a specified number of milliseconds */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Wait for an element to appear in the DOM */
export function waitForElement(
  selector: string,
  timeout: number = 3000,
  root: Element | Document = document
): Promise<Element | null> {
  return new Promise(resolve => {
    const existing = root.querySelector(selector);
    if (existing) return resolve(existing);

    const observer = new MutationObserver(() => {
      const el = root.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(root instanceof Document ? root.body : root, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/** Wait for animations/transitions to complete on an element */
export function waitForAnimations(element: Element, timeout: number = 1000): Promise<void> {
  return new Promise(resolve => {
    const animations = element.getAnimations?.();
    if (!animations || animations.length === 0) {
      return resolve();
    }

    const timer = setTimeout(resolve, timeout);
    Promise.all(animations.map(a => a.finished))
      .then(() => {
        clearTimeout(timer);
        resolve();
      })
      .catch(() => {
        clearTimeout(timer);
        resolve();
      });
  });
}
