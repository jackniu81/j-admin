import { useCallback, useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
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
  DollarOutlined,
  FallOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Column, Line, Pie } from '@ant-design/plots';
import {
  apiReportCategorySales,
  apiReportOrderStatus,
  apiReportOverview,
  apiReportSalesTrend,
  type CategorySalesPoint,
  type OrderStatusBucket,
  type ReportDays,
  type ReportOverview,
  type SalesTrendPoint,
} from '../api/reports';
import { ORDER_STATUS_META } from '../api/orders';

const fmtMoney = (n: number) => `¥${Number(n || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;

export default function Reports() {
  const [days, setDays] = useState<ReportDays>(30);
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [trend, setTrend] = useState<SalesTrendPoint[]>([]);
  const [status, setStatus] = useState<OrderStatusBucket[]>([]);
  const [category, setCategory] = useState<CategorySalesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (d: ReportDays) => {
    setLoading(true);
    setError(null);
    try {
      const [ov, tr, st, ca] = await Promise.all([
        apiReportOverview(d),
        apiReportSalesTrend(d),
        apiReportOrderStatus(),
        apiReportCategorySales(d),
      ]);
      setOverview(ov);
      setTrend(tr);
      setStatus(st);
      setCategory(ca);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '加载报表数据失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(days);
  }, [days, fetchData]);

  if (error) {
    return (
      <PageContainer header={{ title: '报表中心' }}>
        <Alert
          type="error"
          showIcon
          message="报表加载失败"
          description={error}
          action={
            <Button size="small" onClick={() => fetchData(days)}>
              重试
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const trendEmpty = trend.length === 0 || trend.every((t) => t.count === 0);
  const statusPie = status
    .filter((s) => s.count > 0)
    .map((s) => ({ name: ORDER_STATUS_META[s.status].text, value: s.count }));
  const statusEmpty = statusPie.length === 0;
  const categoryCol = category.map((c) => ({ name: c.category, value: c.amount, qty: c.qty }));
  const categoryEmpty = categoryCol.length === 0;

  return (
    <PageContainer
      header={{ title: '报表中心' }}
      extra={
        <Radio.Group
          value={days}
          onChange={(e) => setDays(e.target.value as ReportDays)}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value={7}>近 7 天</Radio.Button>
          <Radio.Button value={14}>近 14 天</Radio.Button>
          <Radio.Button value={30}>近 30 天</Radio.Button>
        </Radio.Group>
      }
    >
      {/* 概览卡 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="销售额"
              value={overview?.totalSales ?? 0}
              precision={2}
              prefix={<DollarOutlined />}
              loading={loading}
              formatter={(v) => fmtMoney(Number(v))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="订单数"
              value={overview?.orderCount ?? 0}
              prefix={<ShoppingCartOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="客单价"
              value={overview?.avgOrderValue ?? 0}
              prefix={<TeamOutlined />}
              loading={loading}
              formatter={(v) => fmtMoney(Number(v))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="取消率"
              value={(overview?.cancelRate ?? 0) * 100}
              precision={1}
              suffix="%"
              prefix={<FallOutlined />}
              valueStyle={{ color: (overview?.cancelRate ?? 0) > 0.1 ? '#cf1322' : '#3f8600' }}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* 销售趋势 */}
      <Card style={{ marginTop: 16 }} title={`销售趋势（近 ${days} 天）`}>
        {loading && !trend.length ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : trendEmpty ? (
          <Empty description="暂无销售数据" />
        ) : (
          <Line
            data={trend}
            xField="date"
            yField="amount"
            height={300}
            point={{ sizeField: 3 }}
            axis={{ y: { title: '销售额' } }}
            tooltip={{ items: [{ channel: 'y', name: '销售额' }] }}
            interaction={{ tooltip: { showCrosshairs: true } }}
          />
        )}
      </Card>

      {/* 订单状态 + 分类销量 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="订单状态分布">
            {statusEmpty ? (
              <Empty description="暂无订单数据" />
            ) : (
              <Pie
                data={statusPie}
                angleField="value"
                colorField="name"
                height={300}
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
            {categoryEmpty ? (
              <Empty description="暂无商品销售数据" />
            ) : (
              <Column
                data={categoryCol}
                xField="name"
                yField="value"
                colorField="name"
                height={300}
                legend={false}
                label={{ position: 'top' }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
