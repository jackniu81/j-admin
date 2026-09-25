import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Column, Line, Pie } from '@ant-design/plots';
import {
  apiDashboardStats,
  apiDashboardStatusDistribution,
  type DashboardStats,
  type StatusBucket,
  type TrendPoint,
} from '../api/dashboard';

type Days = 7 | 14 | 30;

const STATUS_LABEL: Record<'enabled' | 'disabled', string> = {
  enabled: '启用',
  disabled: '禁用',
};

/** 本地生成近 N 天的随机趋势数据（Issue #25：折线图不再依赖后端，视觉更活泼） */
function randomTrend(days: Days): TrendPoint[] {
  const out: TrendPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    out.push({ date: `${y}-${m}-${day}`, count: Math.floor(Math.random() * 21) });
  }
  return out;
}

/** 未实现模块 demo 图数据（一次性随机，避免 render 抖动） */
interface Named { name: string; value: number }
function randomOrderStatus(): Named[] {
  return [
    { name: '待付款', value: 20 + Math.floor(Math.random() * 60) },
    { name: '待发货', value: 20 + Math.floor(Math.random() * 60) },
    { name: '已完成', value: 60 + Math.floor(Math.random() * 120) },
    { name: '已取消', value: 5 + Math.floor(Math.random() * 30) },
  ];
}
function randomProductSales(): Named[] {
  return [
    { name: '数码配件', value: 200 + Math.floor(Math.random() * 400) },
    { name: '家居用品', value: 150 + Math.floor(Math.random() * 400) },
    { name: '服装鞋帽', value: 250 + Math.floor(Math.random() * 500) },
    { name: '美妆个护', value: 180 + Math.floor(Math.random() * 400) },
    { name: '食品生鲜', value: 220 + Math.floor(Math.random() * 400) },
  ];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dist, setDist] = useState<StatusBucket[] | null>(null);
  const [days, setDays] = useState<Days>(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 每次 days 变化重新随机一组趋势；页面挂载即有数据
  const trend = useMemo<TrendPoint[]>(() => randomTrend(days), [days]);
  // demo 图数据只在挂载时随机一次
  const orderStatus = useMemo<Named[]>(() => randomOrderStatus(), []);
  const productSales = useMemo<Named[]>(() => randomProductSales(), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, sd] = await Promise.all([
        apiDashboardStats(),
        apiDashboardStatusDistribution(),
      ]);
      setStats(s);
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
    fetchData();
  }, [fetchData]);

  // 首次加载：骨架
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

  // 接口挂掉：Alert + 重试
  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message="数据加载失败"
        description={error}
        action={
          <Button size="small" onClick={fetchData}>
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

      {/* 折线图：近 N 天新增趋势（随机数据） */}
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
        <Line
          data={trend}
          xField="date"
          yField="count"
          height={280}
          point={{ sizeField: 3 }}
          axis={{ y: { title: '新增数' } }}
          interaction={{ tooltip: { showCrosshairs: true } }}
        />
      </Card>

      {/* 状态分布 + 未实现模块 demo 图 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="订单状态分布">
            <Pie
              data={orderStatus}
              angleField="value"
              colorField="name"
              height={280}
              radius={0.85}
              innerRadius={0.55}
              label={{ text: 'value', style: { fontWeight: 'bold' } }}
              legend={{ position: 'right' }}
              statistic={{
                title: { content: '订单' },
              }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="商品分类销量 TOP 5">
            <Column
              data={productSales}
              xField="name"
              yField="value"
              colorField="name"
              height={280}
              legend={false}
              label={{ position: 'top' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 客户状态分布（真实数据，仍展示） */}
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
            label={{ position: 'inside' }}
          />
        )}
      </Card>
    </div>
  );
}
