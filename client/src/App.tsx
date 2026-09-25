import { Route, Routes } from 'react-router';
import RequireAuth from './auth/RequireAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import { ROUTES } from './routes';

export default function App() {
  return (
    <Routes>
      {/* 公开路由 - 不套后台布局 */}
      <Route path="/login" element={<Login />} />

      {/* 受保护路由 */}
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Layout>
              <Routes>
                {ROUTES.map((r) => {
                  const Comp = r.component;
                  return <Route key={r.path} path={r.path} element={<Comp />} />;
                })}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
