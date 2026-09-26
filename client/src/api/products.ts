import http from './index';
import type { PageResult } from './customers';

export type ProductCategory = '数码配件' | '家居用品' | '服装鞋帽' | '美妆个护' | '食品生鲜';
export type ProductStatus = 'on' | 'off';

/** 商品实体 */
export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  image?: string;
  status: ProductStatus;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type ProductPayload = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

/** 分类常量（下拉/展示共用，与后端 DTO 同规则） */
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  '数码配件',
  '家居用品',
  '服装鞋帽',
  '美妆个护',
  '食品生鲜',
];

export const CATEGORY_COLOR: Record<ProductCategory, string> = {
  数码配件: 'geekblue',
  家居用品: 'green',
  服装鞋帽: 'purple',
  美妆个护: 'magenta',
  食品生鲜: 'orange',
};

/** GET /api/products */
export function apiListProducts(q: ProductQuery): Promise<PageResult<Product>> {
  return http.get('/products', { params: q });
}

/** POST /api/products（admin） */
export function apiCreateProduct(payload: ProductPayload): Promise<Product> {
  return http.post('/products', payload);
}

/** PATCH /api/products/:id（admin） */
export function apiUpdateProduct(id: string, payload: Partial<ProductPayload>): Promise<Product> {
  return http.patch(`/products/${id}`, payload);
}

/** PATCH /api/products/:id/status（admin，上下架） */
export function apiUpdateProductStatus(id: string, status: ProductStatus): Promise<Product> {
  return http.patch(`/products/${id}/status`, { status });
}

/** DELETE /api/products/:id（admin，软删除） */
export function apiDeleteProduct(id: string): Promise<Product> {
  return http.delete(`/products/${id}`);
}
