import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Radio,
  Row,
  Skeleton,
  Statistic,
} from 'antd';
import {
  ArrowUpOutlined,
  CheckCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Column, Line } from '@ant-design/plots';
import {
  apiDashboardStats,
  apiDashboardStatusDistribution,
  apiDashboardTrend,
  type DashboardStats,
  type StatusBucket,
  type TrendPoint,
} from '../api/dashboard';

type Days = 7 | 14 | 30;

const STATUS_LABEL: Record<'enabled' | 'disabled', string> = {
  enabled: '启用',
  disabled: '禁用',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[] | null>(null);
  const [dist, setDist] = useState<StatusBucket[] | null>(null);
  const [days, setDays] = useState<Days>(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (d: Days) => {
    setLoading(true);
    setError(null);
    try {
      const [s, t, sd] = await Promise.all([
        apiDashboardStats(),
        apiDashboardTrend(d),
        apiDashboardStatusDistribution(),
      ]);
      setStats(s);
      setTrend(t);
      setDist(sd);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '加载数据失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(days);
  }, [days, fetchData]);

  // 首次加载中：三卡片骨架，避免闪烁 0
  if (loading && !stats && !error) {
    return (
      <Row gutter={[16, 16]}>
        {[0, 1, 2].map((i) => (
          <Col xs={24} md={8} key={i}>
            <Card>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  // 接口挂掉：整页错误提示 + 重试按钮
  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message="数据加载失败"
        description={error}
        action={
          <Button size="small" onClick={() => fetchData(days)}>
            重试
          </Button>
        }
      />
    );
  }

  const totalCustomers = stats?.totalUsers ?? 0;
  const isEmptyData = totalCustomers === 0;

  return (
    <div>
      {/* 三张统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="总客户数"
              value={stats?.totalUsers ?? 0}
              prefix={<TeamOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="今日新增"
              value={stats?.todayNew ?? 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={stats?.todayNew ? <ArrowUpOutlined /> : undefined}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="活跃客户"
              value={stats?.activeCount ?? 0}
              prefix={<CheckCircleOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* 折线图：近 N 天新增趋势 */}
      <Card
        style={{ marginTop: 16 }}
        title="客户新增趋势"
        extra={
          <Radio.Group
            value={days}
            onChange={(e) => setDays(e.target.value as Days)}
            optionType="button"
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value={7}>近 7 天</Radio.Button>
            <Radio.Button value={14}>近 14 天</Radio.Button>
            <Radio.Button value={30}>近 30 天</Radio.Button>
          </Radio.Group>
        }
      >
        {isEmptyData ? (
          <Empty description="暂无客户数据" />
        ) : (
          <Line
            data={trend ?? []}
            xField="date"
            yField="count"
            height={280}
            point={{ sizeField: 3 }}
            axis={{ y: { title: '新增数' } }}
            interaction={{ tooltip: { showCrosshairs: true } }}
          />
        )}
      </Card>

      {/* 柱状图：状态分布 */}
      <Card style={{ marginTop: 16 }} title="客户状态分布">
        {isEmptyData ? (
          <Empty description="暂无客户数据" />
        ) : (
          <Column
            data={(dist ?? []).map((d) => ({ ...d, label: STATUS_LABEL[d.status] }))}
            xField="label"
            yField="count"
            colorField="status"
            height={280}
            legend={false}
            scale={{ color: { range: ['#52c41a', '#d9d9d9'] } }}
            label={{ position: 'middle' }}
          />
        )}
      </Card>
    </div>
  );
}
