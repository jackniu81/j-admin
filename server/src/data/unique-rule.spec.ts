import { PG_UNIQUE_VIOLATION, UNIQUE_CONFLICT } from './unique-rule';

describe('UNIQUE_CONFLICT 唯一约束文案表', () => {
  it('覆盖 users/customers/orders，字段与种子实体一致', () => {
    expect(UNIQUE_CONFLICT.users?.field).toBe('username');
    expect(UNIQUE_CONFLICT.customers?.field).toBe('email');
    expect(UNIQUE_CONFLICT.orders?.field).toBe('orderNo');
    Object.values(UNIQUE_CONFLICT).forEach((v) => {
      expect(v?.message).toEqual(expect.any(String));
    });
  });

  it('products 无库级唯一约束（名称允许重复），不在表内', () => {
    expect(UNIQUE_CONFLICT.products).toBeUndefined();
  });

  it('pg 唯一冲突 SQLSTATE 为 23505', () => {
    expect(PG_UNIQUE_VIOLATION).toBe('23505');
  });
});
