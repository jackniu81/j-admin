import { useRef, useState } from 'react';
import { PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { message, Switch, Tag } from 'antd';
import { useAuth } from '../auth/AuthContext';
import { Result } from 'antd';
import { apiListUsers, apiUpdateUserStatus, type AdminUser } from '../api/users';

export default function Users() {
  const { isAdmin } = useAuth();
  const actionRef = useRef<ActionType | undefined>(undefined);
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
              message.success(checked ? '已启用' : '已禁用');
              actionRef.current?.reload();
            } catch (e: unknown) {
              // 拦截器已经 message.error；这里只需回滚开关（reload 即可恢复）
              const bizMsg =
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
              if (bizMsg) message.error(bizMsg);
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
      />
    </PageContainer>
  );
}
