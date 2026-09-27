import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TopProgressBar from './TopProgressBar';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const barOf = (container: HTMLElement) =>
  container.querySelector('[aria-hidden="true"]') as HTMLElement | null;

describe('TopProgressBar', () => {
  it('挂载即显示并冲到 30%', () => {
    const { container } = render(
      <MemoryRouter>
        <TopProgressBar />
      </MemoryRouter>,
    );
    const bar = barOf(container);
    expect(bar).not.toBeNull();
    expect(bar!.style.width).toBe('30%');
  });

  it('动画走完后淡出并移除（进度归零）', () => {
    const { container } = render(
      <MemoryRouter>
        <TopProgressBar />
      </MemoryRouter>,
    );
    expect(barOf(container)).not.toBeNull();

    // done(500) -> 100%；再 200ms 隐藏；再 200ms 归零后返回 null
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(barOf(container)).toBeNull();
  });
});
