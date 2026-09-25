import { useRef, useState } from 'react';
import {
  ModalForm,
  PageContainer,
  ProColumns,
  ProFormSelect,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { Button, Popconfirm, Switch, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { Result } from 'antd';
import { showError, showSuccess } from '../utils/feedback';
import {
  apiCreateUser,
  apiDeleteUser,
  apiListUsers,
  apiUpdateUserStatus,
  type AdminUser,
} from '../api/users';

type FormValues = {
  username: string;
  password: string;
  displayName: string;
  role: 'admin' | 'user';
};

export default function Users() {
  const { user, isAdmin } = useAuth();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  // 乐观更新的行 id -> 目标状态；用于 loading 时禁用开关
  const [pending, setPending] = useState<Record<string, boolean>>({});

  // 路由已有 RequireAuth 守卫，页面内二次兜底
  if (!isAdmin) {
    return <Result status="403" title="403" subTitle="仅管理员可访问该页面" />;
  }

  const columns: ProColumns<AdminUser>[] = [
    {
      title: '关键字',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '搜索用户名或显示名' },
    },
    { title: '用户名', dataIndex: 'username', search: false, ellipsis: true },
    { title: '显示名', dataIndex: 'displayName', search: false, ellipsis: true },
    {
      title: '角色',
      dataIndex: 'role',
      search: false,
      width: 100,
      render: (_, row) => (
        <Tag color={row.role === 'admin' ? 'blue' : 'default'}>
          {row.role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      search: false,
      width: 100,
      render: (_, row) => (
        <Switch
          checked={row.status === 'active'}
          loading={!!pending[row.id]}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={async (checked) => {
            const next = checked ? 'active' : 'disabled';
            setPending((p) => ({ ...p, [row.id]: true }));
            try {
              await apiUpdateUserStatus(row.id, next);
              showSuccess(checked ? '已启用' : '已禁用');
              actionRef.current?.reload();
            } catch (e: unknown) {
              // 拦截器已经 showError；这里只需回滚开关（reload 即可恢复）
              const bizMsg =
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
              if (bizMsg) showError(bizMsg);
            } finally {
              setPending((p) => {
                const { [row.id]: _drop, ...rest } = p;
                return rest;
              });
            }
          }}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
      sorter: true,
      width: 180,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      fixed: 'right',
      render: (_, row) =>
        row.id === user?.id
          ? [<span key="self" style={{ color: '#bfbfbf' }}>—</span>]
          : [
              <Popconfirm
                key="del"
                title="确认删除该用户？"
                description="删除后该账号将无法登录，确认删除？"
                okText="删除"
                okButtonProps={{ danger: true }}
                cancelText="取消"
                onConfirm={async () => {
                  try {
                    await apiDeleteUser(row.id);
                    showSuccess('删除成功');
                    actionRef.current?.reload();
                  } catch {
                    /* 拦截器已提示 */
                  }
                }}
              >
                <a style={{ color: '#ff4d4f' }}>删除</a>
              </Popconfirm>,
            ],
    },
  ];

  return (
    <PageContainer header={{ title: false, breadcrumb: {} }}>
      <ProTable<AdminUser>
        rowKey="id"
        headerTitle="用户列表"
        actionRef={actionRef}
        columns={columns}
        search={{ labelWidth: 'auto' }}
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: [10, 20, 50],
          showSizeChanger: true,
        }}
        request={async (params, sort) => {
          const [sortField, sortDir] = Object.entries(sort ?? {})[0] ?? [];
          const res = await apiListUsers({
            page: params.current,
            pageSize: params.pageSize,
            keyword: params.keyword,
            sortBy: sortField,
            sortOrder:
              sortDir === 'ascend' ? 'asc' : sortDir === 'descend' ? 'desc' : undefined,
          });
          return { data: res.list, total: res.total, success: true };
        }}
        toolBarRender={() => [
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            新建用户
          </Button>,
        ]}
      />

      <ModalForm<FormValues>
        key="create-user"
        title="新建用户"
        open={createOpen}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setCreateOpen(false),
        }}
        initialValues={{ role: 'user' }}
        onFinish={async (values) => {
          try {
            await apiCreateUser(values);
            showSuccess('新建成功');
            actionRef.current?.reload();
            setCreateOpen(false);
            return true;
          } catch {
            /* 拦截器已提示（含用户名冲突） */
            return false;
          }
        }}
      >
        <ProFormText
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '3-20 位字母、数字或下划线' },
          ]}
        />
        <ProFormText.Password
          name="password"
          label="密码"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, max: 30, message: '密码长度 6-30 位' },
          ]}
        />
        <ProFormText
          name="displayName"
          label="显示名"
          rules={[
            { required: true, message: '请输入显示名' },
            { max: 30, message: '不能超过 30 字' },
          ]}
        />
        <ProFormSelect
          name="role"
          label="角色"
          options={[
            { label: '管理员', value: 'admin' },
            { label: '普通用户', value: 'user' },
          ]}
          rules={[{ required: true, message: '请选择角色' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}
