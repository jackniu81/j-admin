import { v4 as uuidv4 } from 'uuid';
import { hashSync } from 'bcryptjs';
import {
  CustomerRow,
  OrderItem,
  OrderRow,
  OrderStatus,
  ProductCategory,
  ProductRow,
  UserRow,
} from './data-store.interface';

/**
 * 种子数据（spec §3.4）。
 * - 账号：admin/admin（role=admin）、user2/user2、user3/user3（role=user）
 * - 客户：50 条，createdAt 分散最近 30 天，status 混合，保证分页/搜索/筛选/排序/趋势图都有真实观感
 * - 商品：22 条，覆盖 5 个分类，上架/下架混合
 * - 订单：60 条，引用真实客户与商品，status 四态混合，amount 由 items 汇总（供报表/看板联动）
 * passwordHash 用 bcryptjs，cost 10。
 */
export interface SeedData {
  users: UserRow[];
  customers: CustomerRow[];
  products: ProductRow[];
  orders: OrderRow[];
}

const NAME_PREFIX = ['星辰', '蓝海', '朝阳', '恒信', '睿思', '云帆', '锦程', '拓维', '汇通', '嘉禾'];
const NAME_SUFFIX = ['科技', '贸易', '信息', '网络', '数据', '智能', '咨询', '电子'];
const DOMAINS = ['example.com', 'demo.cn', 'test.io', 'mail.com', 'corp.net'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function phone(i: number): string {
  // 11 位、以 13x~18x 开头的号段，确定性生成便于复现
  const base = 1300000000 + i * 123457;
  return String(base).slice(0, 11);
}

function customers(): SeedData['customers'] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return Array.from({ length: 50 }, (_, i) => {
    const name = `${NAME_PREFIX[i % NAME_PREFIX.length]}${NAME_SUFFIX[(i * 3) % NAME_SUFFIX.length]}${i + 1}号`;
    // 分散到最近 30 天，保证近 7 天也有多条（趋势图有观感）
    const daysAgo = i % 30;
    const ts = new Date(now - daysAgo * dayMs - (i % 24) * 60 * 60 * 1000);
    const iso = ts.toISOString();
    const enabled = i % 4 !== 0; // 约 25% disabled
    return {
      id: uuidv4(),
      createdAt: iso,
      updatedAt: iso,
      deleted: false,
      name,
      email: `customer${pad(i + 1)}@${DOMAINS[i % DOMAINS.length]}`,
      phone: phone(i),
      status: enabled ? 'enabled' : 'disabled',
      remark: i % 5 === 0 ? `重点客户，备注 ${i + 1}` : undefined,
    };
  });
}

function users(): SeedData['users'] {
  const now = new Date().toISOString();
  return [
    {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      deleted: false,
      username: 'admin',
      passwordHash: hashSync('admin', 10),
      displayName: '系统管理员',
      role: 'admin',
      status: 'active',
    },
    {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      deleted: false,
      username: 'user2',
      passwordHash: hashSync('user2', 10),
      displayName: '普通用户2',
      role: 'user',
      status: 'active',
    },
    {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      deleted: false,
      username: 'user3',
      passwordHash: hashSync('user3', 10),
      displayName: '普通用户3',
      role: 'user',
      status: 'active',
    },
  ];
}

// 商品：分类 -> 品名模板（覆盖 5 个分类，共 22 条）
const PRODUCT_CATALOG: Array<[ProductCategory, string[]]> = [
  ['数码配件', ['无线蓝牙耳机', '快充充电器', 'USB-C 数据线', '机械键盘', '无线鼠标', '移动电源']],
  ['家居用品', ['智能感应台灯', '桌面收纳盒', '超声波香薰机', '记忆棉枕头']],
  ['服装鞋帽', ['纯棉短袖T恤', '加绒连帽卫衣', '轻便运动跑鞋', '遮阳棒球帽']],
  ['美妆个护', ['保湿面霜', '氨基酸洁面乳', '哑光口红', '淡香水']],
  ['食品生鲜', ['每日坚果礼盒', '精品咖啡豆', '有机蜂蜜', '进口西冷牛排']],
];

function products(): SeedData['products'] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const rows: ProductRow[] = [];
  let i = 0;
  for (const [category, names] of PRODUCT_CATALOG) {
    for (const name of names) {
      const daysAgo = i % 30;
      const ts = new Date(now - daysAgo * dayMs - (i % 24) * 60 * 60 * 1000).toISOString();
      rows.push({
        id: uuidv4(),
        createdAt: ts,
        updatedAt: ts,
        deleted: false,
        name,
        category,
        price: 30 + ((i * 47) % 970),
        stock: (i * 13) % 500,
        image: `/uploads/seed/product-${pad(i + 1)}.png`,
        status: i % 5 === 0 ? 'off' : 'on',
        remark: i % 7 === 0 ? `热销爆款 ${i + 1}` : undefined,
      });
      i++;
    }
  }
  return rows;
}

const ORDER_STATUSES: OrderStatus[] = ['pending', 'paid', 'completed', 'cancelled'];

function orders(customers: CustomerRow[], products: ProductRow[]): SeedData['orders'] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return Array.from({ length: 60 }, (_, i) => {
    const customer = customers[(i * 7) % customers.length];
    const daysAgo = i % 30;
    const date = new Date(now - daysAgo * dayMs - (i % 24) * 60 * 60 * 1000);
    const iso = date.toISOString();
    // 每单 1-3 件商品
    const itemCount = 1 + (i % 3);
    const items: OrderItem[] = Array.from({ length: itemCount }, (_, j) => {
      const p = products[(i * 3 + j) % products.length];
      return { productId: p.id, name: p.name, price: p.price, qty: 1 + ((i + j) % 4) };
    });
    const amount = items.reduce((sum, it) => sum + it.price * it.qty, 0);
    // 状态分布：约 50% 已完成，其余三态轮转（保证报表各桶都有量）
    const status =
      i % 2 === 0 ? 'completed' : ORDER_STATUSES[(i + 1) % ORDER_STATUSES.length];
    // 订单号：ORD + yyyymmdd + 4 位序号，确定唯一
    const ymd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    return {
      id: uuidv4(),
      createdAt: iso,
      updatedAt: iso,
      deleted: false,
      orderNo: `ORD${ymd}${String(i + 1).padStart(4, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      amount,
      status,
      items: JSON.stringify(items),
      remark: i % 6 === 0 ? `备注 ${i + 1}` : undefined,
    };
  });
}

export function buildSeed(): SeedData {
  const cs = customers();
  const ps = products();
  return {
    users: users(),
    customers: cs,
    products: ps,
    orders: orders(cs, ps),
  };
}
