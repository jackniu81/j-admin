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
import { Column, Line, Pie } from '@ant-design/plots';
import {
  apiDashboardStats,
  apiDashboardStatusDistribution,
  type DashboardStats,
  type StatusBucket,
} from '../api/dashboard';
import {
  apiReportCategorySales,
  apiReportOrderStatus,
  apiReportSalesTrend,
  type CategorySalesPoint,
  type OrderStatusBucket,
  type ReportDays,
  type SalesTrendPoint,
} from '../api/reports';
import { ORDER_STATUS_META } from '../api/orders';

const STATUS_LABEL: Record<'enabled' | 'disabled', string> = {
  enabled: '启用',
  disabled: '禁用',
};

export default function Dashboard() {
  // 客户统计（真实，来自 /api/dashboard/*）
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dist, setDist] = useState<StatusBucket[] | null>(null);
  // 订单/商品报表（真实，来自 /api/reports/*，与报表中心口径一致）
  const [trend, setTrend] = useState<SalesTrendPoint[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatusBucket[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySalesPoint[]>([]);

  const [days, setDays] = useState<ReportDays>(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (d: ReportDays) => {
    setLoading(true);
    setError(null);
    try {
      const [s, sd, tr, os_, ca] = await Promise.all([
        apiDashboardStats(),
        apiDashboardStatusDistribution(),
        apiReportSalesTrend(d),
        apiReportOrderStatus(),
        apiReportCategorySales(d),
      ]);
      setStats(s);
      setDist(sd);
      setTrend(tr);
      setOrderStatus(os_);
      setCategorySales(ca);
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
          <Button size="small" onClick={() => fetchData(days)}>
            重试
          </Button>
        }
      />
    );
  }

  const totalCustomers = stats?.totalUsers ?? 0;
  const isEmptyData = totalCustomers === 0;
  const trendEmpty = trend.length === 0 || trend.every((t) => t.count === 0);
  const statusPie = orderStatus
    .filter((s) => s.count > 0)
    .map((s) => ({ name: ORDER_STATUS_META[s.status].text, value: s.count }));
  const categoryCol = categorySales.map((c) => ({ name: c.category, value: c.amount }));

  return (
    <div>
      {/* 三张统计卡片（客户，真实） */}
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

      {/* 折线图：近 N 天销售趋势（真实，来自报表） */}
      <Card
        style={{ marginTop: 16 }}
        title="销售趋势"
        extra={
          <Radio.Group
            value={days}
            onChange={(e) => setDays(e.target.value as ReportDays)}
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
        {trendEmpty ? (
          <Empty description="暂无销售数据" />
        ) : (
          <Line
            data={trend}
            xField="date"
            yField="amount"
            height={280}
            point={{ sizeField: 3 }}
            axis={{ y: { title: '销售额' } }}
            interaction={{ tooltip: { showCrosshairs: true } }}
          />
        )}
      </Card>

      {/* 订单状态分布 + 商品分类销量 TOP5（真实，来自报表） */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="订单状态分布">
            {statusPie.length === 0 ? (
              <Empty description="暂无订单数据" />
            ) : (
              <Pie
                data={statusPie}
                angleField="value"
                colorField="name"
                height={280}
                radius={0.85}
                innerRadius={0.55}
                label={{ text: 'value', style: { fontWeight: 'bold' } }}
                legend={{ position: 'right' }}
                statistic={{ title: { content: '订单' } }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="商品分类销量 TOP 5">
            {categoryCol.length === 0 ? (
              <Empty description="暂无商品销售数据" />
            ) : (
              <Column
                data={categoryCol}
                xField="name"
                yField="value"
                colorField="name"
                height={280}
                legend={false}
                label={{ position: 'top' }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 客户状态分布（真实数据） */}
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
