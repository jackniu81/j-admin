import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

/**
 * 路由切换时顶部一条细进度条（自实现，不引入 nprogress）。
 * 逻辑：pathname 变化 -> 立刻升到 30% -> 每 300ms 逼近 90% -> 完成时 100% -> 淡出。
 */
export default function TopProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(30);
    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.random() * 12));
    }, 300);
    const done = setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        // 隐藏后重置，供下次切换
        setTimeout(() => setProgress(0), 200);
      }, 200);
    }, 500);
    return () => {
      clearInterval(interval);
      clearTimeout(done);
    };
  }, [location.pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: 2,
        width: `${progress}%`,
        background: '#1677ff',
        transition: 'width .3s ease, opacity .2s',
        opacity: visible ? 1 : 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  );
}
