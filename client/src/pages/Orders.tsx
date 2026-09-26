import { useEffect, useRef, useState } from 'react';
import {
  ModalForm,
  PageContainer,
  ProColumns,
  ProDescriptions,
  ProFormDependency,
  ProFormList,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import type { ActionType, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, Popconfirm, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { showSuccess, showWarning } from '../utils/feedback';
import {
  apiCreateOrder,
  apiDeleteOrder,
  apiGetOrder,
  apiListOrders,
  apiOrderFormOptions,
  apiUpdateOrder,
  apiUpdateOrderStatus,
  ORDER_NEXT_STATUS,
  ORDER_STATUS_META,
  type Order,
  type OrderFormOptions,
  type OrderStatus,
} from '../api/orders';

type ItemRow = { productId: string; qty: number };
type FormValues = {
  customerId: string;
  orderNo?: string;
  items: ItemRow[];
  remark?: string;
};

const STATUS_VALUE_ENUM = {
  pending: { text: '待付款', status: 'Warning' },
  paid: { text: '待发货', status: 'Processing' },
  completed: { text: '已完成', status: 'Success' },
  cancelled: { text: '已取消', status: 'Default' },
};

export default function Orders() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const actionRef = useRef<ActionType | undefined>(undefined);

  // 表单可选项（客户 + 上架商品）
  const [options, setOptions] = useState<OrderFormOptions>({ customers: [], products: [] });
  // 详情抽屉
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // 新增/编辑弹窗
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const formRef = useRef<ProFormInstance<FormValues> | null>(null);

  useEffect(() => {
    if (isAdmin) {
      apiOrderFormOptions()
        .then(setOptions)
        .catch(() => undefined);
    }
  }, [isAdmin]);

  const productOptions = options.products.map((p) => ({
    label: `${p.name}（¥${p.price}）`,
    value: p.id,
    price: p.price,
  }));
  const priceOf = (id: string) => options.products.find((p) => p.id === id)?.price ?? 0;

  const columns: ProColumns<Order>[] = [
    {
      title: '关键字',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '搜索订单号或客户名' },
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: STATUS_VALUE_ENUM,
      render: (_, row) => (
        <Tag color={ORDER_STATUS_META[row.status]?.color}>
          {ORDER_STATUS_META[row.status]?.text ?? row.status}
        </Tag>
      ),
    },
    {
      title: '下单日期',
      dataIndex: 'dateRange',
      valueType: 'dateRange',
      hideInTable: true,
      search: { transform: (v) => ({ from: v?.[0], to: v?.[1] }) },
    },
    { title: '订单号', dataIndex: 'orderNo', search: false, copyable: true, width: 200 },
    { title: '客户', dataIndex: 'customerName', search: false, ellipsis: true },
    {
      title: '金额',
      dataIndex: 'amount',
      search: false,
      sorter: true,
      valueType: 'money',
      width: 120,
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      search: false,
      sorter: true,
      valueType: 'dateTime',
      width: 180,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_, row) => {
        const detailBtn = (
          <a
            key="detail"
            onClick={async () => {
              const full = await apiGetOrder(row.id).catch(() => row);
              setDetail(full);
              setDetailOpen(true);
            }}
          >
            详情
          </a>
        );
        if (!isAdmin) return [detailBtn];

        const nexts = ORDER_NEXT_STATUS[row.status] ?? [];
        return [
          detailBtn,
          <a
            key="edit"
            onClick={() => {
              setEditing(row);
              formRef.current?.setFieldsValue({
                customerId: row.customerId,
                orderNo: row.orderNo,
                remark: row.remark,
                items: row.items.map((it) => ({ productId: it.productId, qty: it.qty })),
              });
              setOpen(true);
            }}
          >
            编辑
          </a>,
          ...nexts.map((next: OrderStatus) => (
            <Popconfirm
              key={`st-${next}`}
              title={`确认${ORDER_STATUS_META[next].text}？`}
              okText="确认"
              cancelText="取消"
              onConfirm={async () => {
                try {
                  await apiUpdateOrderStatus(row.id, next);
                  showSuccess('状态已更新');
                  actionRef.current?.reload();
                } catch {
                  /* 拦截器已提示 */
                }
              }}
            >
              <a style={{ color: next === 'cancelled' ? '#ff4d4f' : undefined }}>
                {ORDER_STATUS_META[next].text}
              </a>
            </Popconfirm>
          )),
          <Popconfirm
            key="del"
            title="确认删除该订单？"
            description="软删除，列表中不再显示。"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={async () => {
              try {
                await apiDeleteOrder(row.id);
                showSuccess('删除成功');
                actionRef.current?.reload();
              } catch {
                /* 拦截器已提示 */
              }
            }}
          >
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>,
        ];
      },
    },
  ];

  const handleFinish = async (values: FormValues) => {
    const payload = {
      customerId: values.customerId,
      items: (values.items ?? []).filter((it) => it && it.productId && it.qty > 0),
      orderNo: values.orderNo?.trim() || undefined,
      remark: values.remark,
    };
    if (payload.items.length === 0) {
      showWarning('请至少选择一件商品');
      return false;
    }
    try {
      if (editing) {
        await apiUpdateOrder(editing.id, payload);
        showSuccess('更新成功');
      } else {
        await apiCreateOrder(payload);
        showSuccess('新增成功');
      }
      actionRef.current?.reload();
      setOpen(false);
      return true;
    } catch {
      /* 拦截器已提示（含订单号冲突） */
      return false;
    }
  };

  return (
    <PageContainer header={{ title: false, breadcrumb: {} }}>
      <ProTable<Order>
        rowKey="id"
        headerTitle="订单列表"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={{ labelWidth: 'auto' }}
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: [10, 20, 50],
          showSizeChanger: true,
        }}
        request={async (params, sort) => {
          const [sortField, sortDir] = Object.entries(sort ?? {})[0] ?? [];
          const res = await apiListOrders({
            page: params.current,
            pageSize: params.pageSize,
            keyword: params.keyword,
            status: params.status,
            sortBy: sortField,
            sortOrder:
              sortDir === 'ascend' ? 'asc' : sortDir === 'descend' ? 'desc' : undefined,
            from: params.from,
            to: params.to,
          });
          return { data: res.list, total: res.total, success: true };
        }}
        toolBarRender={() =>
          isAdmin
            ? [
                <Button
                  key="add"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditing(null);
                    setOpen(true);
                  }}
                >
                  新增订单
                </Button>,
              ]
            : []
        }
      />

      {/* 详情抽屉：主从结构，items 子表 */}
      <Drawer
        title="订单详情"
        width={640}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        destroyOnClose
      >
        {detail && (
          <>
            <ProDescriptions<Order>
              column={1}
              dataSource={detail}
              columns={[
                { title: '订单号', dataIndex: 'orderNo', copyable: true },
                { title: '客户', dataIndex: 'customerName' },
                { title: '金额', dataIndex: 'amount', valueType: 'money' },
                {
                  title: '状态',
                  dataIndex: 'status',
                  render: (_, r) => (
                    <Tag color={ORDER_STATUS_META[r.status]?.color}>
                      {ORDER_STATUS_META[r.status]?.text}
                    </Tag>
                  ),
                },
                { title: '下单时间', dataIndex: 'createdAt', valueType: 'dateTime' },
                { title: '备注', dataIndex: 'remark' },
              ]}
            />
            <Table
              style={{ marginTop: 16 }}
              size="small"
              rowKey="productId"
              dataSource={detail.items}
              pagination={false}
              columns={[
                { title: '商品', dataIndex: 'name' },
                { title: '单价', dataIndex: 'price', width: 100, render: (v: number) => `¥${v}` },
                { title: '数量', dataIndex: 'qty', width: 80 },
                {
                  title: '小计',
                  dataIndex: 'subtotal',
                  width: 120,
                  render: (_: unknown, r) => `¥${(r.price * r.qty).toFixed(2)}`,
                },
              ]}
            />
          </>
        )}
      </Drawer>

      <ModalForm<FormValues>
        key={editing?.id ?? 'create'}
        title={editing ? '编辑订单' : '新增订单'}
        open={open}
        formRef={formRef}
        modalProps={{
          destroyOnClose: true,
          width: 640,
          onCancel: () => {
            setOpen(false);
            setEditing(null);
          },
        }}
        initialValues={{ items: [{ qty: 1 }] }}
        onFinish={handleFinish}
        onFinishFailed={() => showWarning('请修正表单错误')}
      >
        <ProFormSelect
          name="customerId"
          label="客户"
          showSearch
          options={options.customers.map((c) => ({ label: c.name, value: c.id }))}
          rules={[{ required: true, message: '请选择客户' }]}
        />
        <ProFormText
          name="orderNo"
          label="订单号"
          placeholder="留空由系统自动生成"
          fieldProps={{ maxLength: 30 }}
        />
        <ProFormList
          name="items"
          label="订单明细"
          creatorButtonProps={{ creatorButtonText: '添加商品' }}
          min={1}
          copyIconProps={false}
          itemRender={({ listDom, action }) => (
            <Space style={{ marginBottom: 8 }} align="baseline">
              {listDom}
              {action}
            </Space>
          )}
        >
          <Space align="baseline">
            <ProFormSelect
              name="productId"
              label="商品"
              width="md"
              showSearch
              options={productOptions}
              rules={[{ required: true, message: '请选择商品' }]}
            />
            <ProFormText
              name="qty"
              label="数量"
              width="xs"
              fieldProps={{ type: 'number', min: 1 }}
              rules={[{ required: true, message: '请输入数量' }]}
            />
          </Space>
        </ProFormList>
        <ProFormDependency name={['items']}>
          {({ items }) => {
            const total = ((items ?? []) as ItemRow[]).reduce(
              (sum, it) => sum + (priceOf(it?.productId) * Number(it?.qty || 0)),
              0,
            );
            return (
              <div style={{ textAlign: 'right', fontWeight: 600 }}>合计：¥{total.toFixed(2)}</div>
            );
          }}
        </ProFormDependency>
        <ProFormTextArea
          name="remark"
          label="备注"
          fieldProps={{ maxLength: 200, showCount: true, rows: 2 }}
        />
      </ModalForm>
    </PageContainer>
  );
}
