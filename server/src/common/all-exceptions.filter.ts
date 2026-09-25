import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse, BIZ_HTTP_STATUS, HTTP_STATUS_TO_BIZ_CODE } from './response';
import { BizException } from './biz.exception';

/**
 * 全局异常过滤器：把任何异常收敛成统一响应体 { code, message, data }。
 * - BizException / 带 code 的 HttpException：原样透出
 * - ValidationPipe 的 400（response 是字符串数组）：归为 40000 并附字段错误
 * - 其余 HttpException：按 HTTP 状态映射业务码
 * - 未知异常：50000，打印完整堆栈到日志，对外不暴露细节
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof BizException) {
      const body = exception.getResponse() as ApiResponse;
      res.status(exception.getStatus()).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();

      // ValidationPipe：raw = { statusCode, error:'Bad Request', message: string[] }
      if (status === HttpStatus.BAD_REQUEST && Array.isArray((raw as any)?.message)) {
        const errors = (raw as any).message as string[];
        res.status(status).json({
          code: 40000,
          message: '参数校验失败',
          data: { errors },
        });
        return;
      }

      // 已带业务码的对象响应
      if (typeof raw === 'object' && raw !== null && 'code' in raw) {
        res.status(status).json(raw);
        return;
      }

      const code = HTTP_STATUS_TO_BIZ_CODE[status as HttpStatus] ?? 50000;
      const message =
        typeof raw === 'string' ? raw : ((raw as any)?.message ?? exception.message);
      res.status(BIZ_HTTP_STATUS[code] ?? status).json({
        code,
        message: typeof message === 'string' ? message : '请求失败',
        data: null,
      });
      return;
    }

    // 非 HttpException：视为服务端 bug
    const err = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(err.message, err.stack);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 50000,
      message: '服务内部异常',
      data: null,
    });
  }
}
