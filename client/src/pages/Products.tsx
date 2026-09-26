import { useRef, useState } from 'react';
import type { ComponentType } from 'react';
import {
  ModalForm,
  PageContainer,
  ProColumns,
  ProFormDigit,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProFormUploadButton,
  ProTable,
} from '@ant-design/pro-components';
import type { ActionType, ProFormInstance } from '@ant-design/pro-components';
import { Button, Image, Popconfirm, Switch, Tag, Upload, message } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { showSuccess, showWarning } from '../utils/feedback';
import {
  apiCreateProduct,
  apiDeleteProduct,
  apiListProducts,
  apiUpdateProduct,
  apiUpdateProductStatus,
  CATEGORY_COLOR,
  PRODUCT_CATEGORIES,
  type Product,
  type ProductCategory,
  type ProductStatus,
} from '../api/products';
import { UPLOAD_IMAGE_URL, uploadHeaders } from '../api/upload';

type FormValues = {
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  image?: UploadFile[];
  status: ProductStatus;
  remark?: string;
};

const MAX_SIZE_MB = 2;
const ACCEPT = '.jpg,.jpeg,.png,.webp,.gif';

/**
 * ProFormUploadButton 的类型是 ForwardRefRenderFunction（需两参），
 * 与 React 19 的 JSX 元素签名不兼容，此处转成普通组件类型规避 TS2786。
 */
const UploadImageButton = ProFormUploadButton as unknown as ComponentType<Record<string, unknown>>;

/** 从上传控件的值里取最终图片 URL（新建取 response.data.url，编辑取已存在的 url） */
function extractImageUrl(list?: UploadFile[]): string | undefined {
  const f = list?.[0];
  if (!f) return undefined;
  const resp = (f as { response?: { data?: { url?: string }; url?: string } }).response;
  return resp?.data?.url ?? resp?.url ?? f.url ?? f.thumbUrl;
}

export default function Products() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const formRef = useRef<ProFormInstance<FormValues> | null>(null);

  const openCreate = () => {
    setEditing(null);
    formRef.current?.resetFields();
    setOpen(true);
  };

  const openEdit = (row: Product) => {
    setEditing(row);
    formRef.current?.setFieldsValue({
      name: row.name,
      category: row.category,
      price: row.price,
      stock: row.stock,
      status: row.status,
      remark: row.remark,
      image: row.image
        ? [
            {
              uid: '-1',
              name: row.image,
              status: 'done',
              url: row.image,
              thumbUrl: row.image,
            } as UploadFile,
          ]
        : [],
    });
    setOpen(true);
  };

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
    if (!isImage) {
      message.error('仅支持 jpg / png / webp / gif 图片');
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > MAX_SIZE_MB) {
      message.error(`图片大小不能超过 ${MAX_SIZE_MB}MB`);
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const columns: ProColumns<Product>[] = [
    {
      title: '关键字',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '搜索名称或分类' },
    },
    {
      title: '状态',
      dataIndex: 'status',
      hideInTable: true,
      valueType: 'select',
      valueEnum: { on: { text: '上架' }, off: { text: '下架' } },
    },
    {
      title: '图片',
      dataIndex: 'image',
      search: false,
      width: 80,
      render: (_, row) =>
        row.image ? (
          <Image src={row.image} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <span style={{ color: '#bfbfbf' }}>无</span>
        ),
    },
    { title: '名称', dataIndex: 'name', sorter: true, search: false, ellipsis: true },
    {
      title: '分类',
      dataIndex: 'category',
      search: false,
      width: 110,
      render: (_, row) => <Tag color={CATEGORY_COLOR[row.category]}>{row.category}</Tag>,
    },
    {
      title: '价格',
      dataIndex: 'price',
      sorter: true,
      search: false,
      width: 110,
      render: (_, row) => `¥${Number(row.price).toFixed(2)}`,
    },
    { title: '库存', dataIndex: 'stock', sorter: true, search: false, width: 90 },
    {
      title: '上架',
      dataIndex: 'statusDisplay',
      search: false,
      width: 90,
      render: (_, row) => (
        <Switch
          checked={row.status === 'on'}
          disabled={!isAdmin}
          checkedChildren="上架"
          unCheckedChildren="下架"
          onChange={async (checked) => {
            const next: ProductStatus = checked ? 'on' : 'off';
            try {
              await apiUpdateProductStatus(row.id, next);
              showSuccess(next === 'on' ? '已上架' : '已下架');
              actionRef.current?.reload();
            } catch {
              /* 拦截器已提示 */
            }
          }}
        />
      ),
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
      width: 130,
      fixed: 'right',
      search: false,
      render: (_, row) =>
        isAdmin
          ? [
              <a key="edit" onClick={() => openEdit(row)}>
                编辑
              </a>,
              <Popconfirm
                key="del"
                title="确认删除该商品？"
                okText="删除"
                okButtonProps={{ danger: true }}
                cancelText="取消"
                onConfirm={async () => {
                  try {
                    await apiDeleteProduct(row.id);
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
    const payload = {
      name: values.name,
      category: values.category,
      price: values.price,
      stock: values.stock,
      image: extractImageUrl(values.image),
      status: values.status,
      remark: values.remark,
    };
    try {
      if (editing) {
        await apiUpdateProduct(editing.id, payload);
        showSuccess('更新成功');
      } else {
        await apiCreateProduct(payload);
        showSuccess('新增成功');
      }
      actionRef.current?.reload();
      setOpen(false);
      return true;
    } catch {
      /* 拦截器已提示 */
      return false;
    }
  };

  return (
    <PageContainer header={{ title: false, breadcrumb: {} }}>
      <ProTable<Product>
        rowKey="id"
        headerTitle="商品列表"
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
          const res = await apiListProducts({
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
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  新增商品
                </Button>,
              ]
            : []
        }
      />

      <ModalForm<FormValues>
        key={editing?.id ?? 'create'}
        title={editing ? '编辑商品' : '新增商品'}
        open={open}
        formRef={formRef}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => {
            setOpen(false);
            setEditing(null);
          },
        }}
        initialValues={{ status: 'on' }}
        onFinish={handleFinish}
        onFinishFailed={() => showWarning('请修正表单错误')}
      >
        <ProFormText
          name="name"
          label="商品名称"
          rules={[
            { required: true, message: '请输入商品名称' },
            { max: 50, message: '名称最多 50 字' },
          ]}
        />
        <ProFormSelect
          name="category"
          label="分类"
          options={PRODUCT_CATEGORIES.map((c) => ({ label: c, value: c }))}
          rules={[{ required: true, message: '请选择分类' }]}
        />
        <ProFormDigit
          name="price"
          label="价格"
          min={0}
          max={999999}
          fieldProps={{ precision: 2 }}
          rules={[{ required: true, message: '请输入价格' }]}
        />
        <ProFormDigit
          name="stock"
          label="库存"
          min={0}
          max={9999999}
          fieldProps={{ precision: 0 }}
          rules={[{ required: true, message: '请输入库存' }]}
        />
        <UploadImageButton
          name="image"
          label="商品图片"
          max={1}
          listType="picture-card"
          accept={ACCEPT}
          fieldProps={{
            name: 'file',
            action: UPLOAD_IMAGE_URL,
            headers: uploadHeaders(),
            beforeUpload,
          }}
          extra={`支持 jpg/png/webp/gif，不超过 ${MAX_SIZE_MB}MB`}
        />
        <ProFormRadio.Group
          name="status"
          label="状态"
          options={[
            { label: '上架', value: 'on' },
            { label: '下架', value: 'off' },
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
