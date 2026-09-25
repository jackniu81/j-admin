import { Link } from 'react-router';
import { Button, Space, Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function NotFound() {
  return (
    <Space direction="vertical" size="middle">
      <Title level={2}>404</Title>
      <Paragraph type="secondary">That page doesn&apos;t exist.</Paragraph>
      <Link to="/">
        <Button type="primary">← Back home</Button>
      </Link>
    </Space>
  );
}
