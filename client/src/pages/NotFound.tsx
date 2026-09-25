import { useNavigate } from 'react-router';
import { Button, Result } from 'antd';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="404"
      subTitle="抱歉，你访问的页面不存在。"
      extra={
        <Button type="primary" onClick={() => navigate('/', { replace: true })}>
          返回首页
        </Button>
      }
    />
  );
}
