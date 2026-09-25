import { HttpStatus } from '@nestjs/common';

/** 统一响应体：所有 /api 返回值与错误返回都是这个结构 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 业务错误码 -> HTTP 状态码映射（spec §4.2） */
export const BIZ_HTTP_STATUS: Readonly<Record<number, HttpStatus>> = {
  40000: HttpStatus.BAD_REQUEST,
  40100: HttpStatus.UNAUTHORIZED,
  40101: HttpStatus.UNAUTHORIZED,
  40300: HttpStatus.FORBIDDEN,
  40400: HttpStatus.NOT_FOUND,
  40900: HttpStatus.CONFLICT,
  50000: HttpStatus.INTERNAL_SERVER_ERROR,
};

/** Nest 内置 HTTP 异常 -> 业务错误码 */
export const HTTP_STATUS_TO_BIZ_CODE: Readonly<Partial<Record<HttpStatus, number>>> = {
  [HttpStatus.BAD_REQUEST]: 40000,
  [HttpStatus.UNAUTHORIZED]: 40100,
  [HttpStatus.FORBIDDEN]: 40300,
  [HttpStatus.NOT_FOUND]: 40400,
  [HttpStatus.CONFLICT]: 40900,
};
