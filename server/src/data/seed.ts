import { v4 as uuidv4 } from 'uuid';
import { hashSync } from 'bcryptjs';
import { CustomerRow, UserRow } from './data-store.interface';

/**
 * 种子数据（spec §3.4）。
 * - 账号：admin/admin（role=admin）、user1/user1（role=user）
 * - 客户：50 条，createdAt 分散最近 30 天，status 混合，保证分页/搜索/筛选/排序/趋势图都有真实观感
 * passwordHash 用 bcryptjs，cost 10。
 */
export interface SeedData {
  users: UserRow[];
  customers: CustomerRow[];
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
      username: 'user1',
      passwordHash: hashSync('user1', 10),
      displayName: '普通用户',
      role: 'user',
      status: 'active',
    },
  ];
}

export function buildSeed(): SeedData {
  return { users: users(), customers: customers() };
}
