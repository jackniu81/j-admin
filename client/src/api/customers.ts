import http from './index';

/** 客户实体 */
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'enabled' | 'disabled';
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type CustomerPayload = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>;

/** GET /api/customers */
export function apiListCustomers(q: CustomerQuery): Promise<PageResult<Customer>> {
  return http.get('/customers', { params: q });
}

/** POST /api/customers */
export function apiCreateCustomer(payload: CustomerPayload): Promise<Customer> {
  return http.post('/customers', payload);
}

/** PATCH /api/customers/:id */
export function apiUpdateCustomer(id: string, payload: Partial<CustomerPayload>): Promise<Customer> {
  return http.patch(`/customers/${id}`, payload);
}

/** DELETE /api/customers/:id（软删除） */
export function apiDeleteCustomer(id: string): Promise<Customer> {
  return http.delete(`/customers/${id}`);
}
