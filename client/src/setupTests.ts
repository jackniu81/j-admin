import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom 不提供 matchMedia，AntD v5 部分组件（App/Grid/Result）会用到 -> 补一个最小桩
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// 每个用例后卸载组件，避免跨用例 DOM 泄漏（globals 模式下 RTL 也会自动 cleanup，这里显式兜底）
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
