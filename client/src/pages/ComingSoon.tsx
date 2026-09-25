import { useLocation, useNavigate } from 'react-router';
import { Button, Result } from 'antd';
import { ROUTES } from '../routes';

/**
 * 通用「功能开发中」占位页。
 * 侧边栏中未实现的模块统一路由到此，通过当前 pathname 在 ROUTES 里查对应 meta.title。
 */
export default function ComingSoon() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = ROUTES.find((r) => r.path === location.pathname);
  const title = route?.meta?.title ?? route?.label ?? '该功能';

  return (
    <Result
      status="info"
      title={`${title} · 功能开发中`}
      subTitle="该模块正在规划与实现中，敬请期待。"
      extra={
        <Button type="primary" onClick={() => navigate('/', { replace: true })}>
          返回首页
        </Button>
      }
    />
  );
}
