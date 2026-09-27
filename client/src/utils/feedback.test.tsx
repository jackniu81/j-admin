import { afterEach, describe, expect, it, vi } from 'vitest';
import { showError, showForbidden, showSuccess } from './feedback';

afterEach(() => vi.restoreAllMocks());

// FeedbackInit 未挂载时，反馈应安全降级为 NOOP（DEV 下打 warn），而不是崩溃
describe('feedback 未初始化兜底', () => {
  it('showError / showSuccess / showForbidden 均不抛错，并提示 <App> 未包裹', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => showError('boom')).not.toThrow();
    expect(() => showSuccess('ok')).not.toThrow();
    expect(() => showForbidden()).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('AntD <App> 未包裹'));
  });
});
