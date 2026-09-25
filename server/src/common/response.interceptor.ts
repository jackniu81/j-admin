import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from './response';

function hasCode(v: unknown): v is ApiResponse {
  return typeof v === 'object' && v !== null && 'code' in v;
}

/**
 * 把 controller 返回值统一包成 { code: 0, message: 'ok', data }。
 * 已经是标准响应体（带 code）的直接透传，避免二次包装。
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse> {
    return next.handle().pipe(
      map((value) => {
        if (hasCode(value)) return value;
        return { code: 0, message: 'ok', data: value ?? null };
      }),
    );
  }
}
