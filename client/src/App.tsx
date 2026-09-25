import { Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { Spin } from 'antd';
import RequireAuth from './auth/RequireAuth';
import Layout from './components/Layout';
import TopProgressBar from './components/TopProgressBar';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import { ROUTES } from './routes';

/** 懒加载页面时的 Suspense 兜底：居中 Spin，避免慢网络下白屏 */
function PageFallback() {
  return (
    <div style={{ textAlign: 'center', padding: 120 }}>
      <Spin size="large" />
    </div>
  );
}

export default function App() {
  return (
    <>
      <TopProgressBar />
      <Routes>
        {/* 公开路由 - 不套后台布局 */}
        <Route path="/login" element={<Login />} />

        {/* 受保护路由 */}
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    {ROUTES.map((r) => {
                      const Comp = r.component;
                      return <Route key={r.path} path={r.path} element={<Comp />} />;
                    })}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </>
  );
}
