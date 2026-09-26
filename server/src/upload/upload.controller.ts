import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Roles } from '../common';
import { MulterErrorFilter } from './multer-error.filter';
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  buildFilename,
  ensureMonthDir,
  monthDirName,
  toPublicUrl,
} from './uploads-path';

/** multer 落盘的文件对象（仅取用到的字段） */
interface SavedFile {
  filename: string;
  mimetype: string;
  size: number;
  originalname: string;
}

@Controller('upload')
@UseFilters(MulterErrorFilter)
export class UploadController {
  /**
   * 图片上传（admin）：存 server/uploads/yyyy-mm/uuid.ext，返回 { url }。
   * 类型白名单在 fileFilter 拦截，大小由 multer limits + 兜底校验双重保证。
   */
  @Roles('admin')
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const month = monthDirName();
          cb(null, ensureMonthDir(month));
        },
        filename: (_req, file, cb) => cb(null, buildFilename(file.originalname)),
      }),
      limits: { fileSize: MAX_IMAGE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
          cb(new BadRequestException('仅支持 jpg / png / webp / gif 图片'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file?: SavedFile) {
    if (!file) {
      throw new BadRequestException('未检测到上传的文件（字段名需为 file）');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('图片大小不能超过 2MB');
    }
    const url = toPublicUrl(monthDirName(), file.filename);
    return { url };
  }
}
