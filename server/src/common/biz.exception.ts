import { HttpException, HttpStatus } from '@nestjs/common';
import { BIZ_HTTP_STATUS } from './response';

/**
 * 业务异常：业务层主动抛出，AllExceptionsFilter 按 code 映射 HTTP 状态。
 * 例：throw new BizException(40900, '邮箱已被使用');
 */
export class BizException extends HttpException {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    const httpStatus = BIZ_HTTP_STATUS[code] ?? HttpStatus.BAD_REQUEST;
    super({ code, message, data: null }, httpStatus);
  }
}
