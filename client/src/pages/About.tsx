import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Space, Typography } from 'antd';
import { fetchVersion, type ApiVersion } from '../lib/api';

const { Title, Paragraph, Text } = Typography;

type Status = 'loading' | 'ok' | 'error';

export default function About() {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<ApiVersion | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setStatus('loading');
    setError(null);
    try {
      const v = await fetchVersion();
      setData(v);
      setStatus('ok');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={2}>About</Title>
        <Paragraph type="secondary">
          This data comes from the live API: <Text code>GET /api/version</Text>
        </Paragraph>
      </div>

      <Card size="small">
        {status === 'loading' && <Text type="secondary">Loading…</Text>}

        {status === 'error' && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              type="error"
              showIcon
              message={`Failed to load: ${error}`}
            />
            <Button type="primary" onClick={() => void load()}>
              Retry
            </Button>
          </Space>
        )}

        {status === 'ok' && data && (
          <Descriptions
            column={2}
            size="small"
            items={[
              { key: 'name', label: 'API name', children: data.name },
              { key: 'version', label: 'API version', children: data.version },
              { key: 'node', label: 'Node runtime', children: data.node },
              {
                key: 'time',
                label: 'Server time',
                children: <Text code>{data.timestamp}</Text>,
              },
              {
                key: 'ui',
                label: 'UI version',
                children: <Text code>v{__APP_VERSION__}</Text>,
              },
            ]}
          />
        )}
      </Card>
    </Space>
  );
}
