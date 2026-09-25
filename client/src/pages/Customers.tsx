import { useRef, useState } from 'react';
import {
  ModalForm,
  PageContainer,
  ProColumns,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  ProTable,
} from '@ant-design/pro-components';
import type { ActionType, ProFormInstance } from '@ant-design/pro-components';
import { Button, Popconfirm, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { showSuccess, showWarning } from '../utils/feedback';
import {
  apiCreateCustomer,
  apiDeleteCustomer,
  apiListCustomers,
  apiUpdateCustomer,
  type Customer,
} from '../api/customers';

type FormValues = {
  name: string;
  email: string;
  phone?: string;
  status: 'enabled' | 'disabled';
  remark?: string;
};

export default function Customers() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const formRef = useRef<ProFormInstance<FormValues> | null>(null);

  const columns: ProColumns<Customer>[] = [
    {
      title: '关键字',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '搜索名称或邮箱' },
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        enabled: { text: '启用', status: 'Success' },
        disabled: { text: '禁用', status: 'Default' },
      },
      render: (_, row) => (
        <Tag color={row.status === 'enabled' ? 'green' : 'default'}>
          {row.status === 'enabled' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      sorter: true,
      search: false,
      ellipsis: true,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      search: false,
      ellipsis: true,
      copyable: true,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      search: false,
      width: 140,
      render: (_, row) => row.phone ?? '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      sorter: true,
      search: false,
      valueType: 'dateTime',
      width: 180,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      hideInSearch: true,
      render: (_, row) =>
        isAdmin
          ? [
              <a
                key="edit"
                onClick={() => {
                  setEditing(row);
                  formRef.current?.setFieldsValue({
                    name: row.name,
                    email: row.email,
                    phone: row.phone,
                    status: row.status,
                    remark: row.remark,
                  });
                  setOpen(true);
                }}
              >
                编辑
              </a>,
              <Popconfirm
                key="del"
                title="确认删除该客户？"
                description="删除后可在数据库恢复，确认删除？"
                okText="删除"
                okButtonProps={{ danger: true }}
                cancelText="取消"
                onConfirm={async () => {
                  try {
                    await apiDeleteCustomer(row.id);
                    showSuccess('删除成功');
                    actionRef.current?.reload();
                  } catch {
                    /* 拦截器已提示 */
                  }
                }}
              >
                <a style={{ color: '#ff4d4f' }}>删除</a>
              </Popconfirm>,
            ]
          : [<span key="none" style={{ color: '#bfbfbf' }}>—</span>],
    },
  ];

  const handleFinish = async (values: FormValues) => {
    try {
      if (editing) {
        await apiUpdateCustomer(editing.id, values);
        showSuccess('更新成功');
      } else {
        await apiCreateCustomer(values);
        showSuccess('新增成功');
      }
      actionRef.current?.reload();
      setOpen(false);
      return true;
    } catch {
      /* 拦截器已提示（含邮箱冲突） */
      return false;
    }
  };

  return (
    <PageContainer header={{ title: false, breadcrumb: {} }}>
      <ProTable<Customer>
        rowKey="id"
        headerTitle="客户列表"
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
          // ProTable sort: { field: 'ascend' | 'descend' } → 后端 sortBy / sortOrder
          const [sortField, sortDir] = Object.entries(sort ?? {})[0] ?? [];
          const res = await apiListCustomers({
            page: params.current,
            pageSize: params.pageSize,
            keyword: params.keyword,
            status: params.status,
            sortBy: sortField,
            sortOrder: sortDir === 'ascend' ? 'asc' : sortDir === 'descend' ? 'desc' : undefined,
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
                  新增客户
                </Button>,
              ]
            : []
        }
      />

      <ModalForm<FormValues>
        key={editing?.id ?? 'create'}
        title={editing ? '编辑客户' : '新增客户'}
        open={open}
        formRef={formRef}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => {
            setOpen(false);
            setEditing(null);
          },
        }}
        initialValues={{ status: 'enabled' }}
        onFinish={handleFinish}
        onFinishFailed={() => showWarning('请修正表单错误')}
      >
        <ProFormText
          name="name"
          label="客户名称"
          rules={[
            { required: true, message: '请输入客户名称' },
            { min: 2, max: 30, message: '长度 2-30 字' },
          ]}
        />
        <ProFormText
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '邮箱格式不正确' },
          ]}
        />
        <ProFormText
          name="phone"
          label="手机号"
          rules={[{ pattern: /^\d{11}$/, message: '需为 11 位数字' }]}
        />
        <ProFormSelect
          name="status"
          label="状态"
          options={[
            { label: '启用', value: 'enabled' },
            { label: '禁用', value: 'disabled' },
          ]}
          rules={[{ required: true, message: '请选择状态' }]}
        />
        <ProFormTextArea
          name="remark"
          label="备注"
          fieldProps={{ maxLength: 200, showCount: true, rows: 3 }}
        />
      </ModalForm>
    </PageContainer>
  );
}
