import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { MulterError } from 'multer';

/**
 * 把 multer 的上传错误（超大小 / 字段数等）收敛成 400 友好提示，
 * 避免落到全局过滤器被当成 50000。仅作用于 upload 控制器。
 */
@Catch(MulterError)
export class MulterErrorFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse();
    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? '图片大小不能超过 2MB'
        : `上传失败：${exception.message}`;
    const body = new BadRequestException(message).getResponse();
    res.status(400).json({ code: 40000, message, data: body });
  }
}
