import { Controller, Get } from '@nestjs/common';
import { Public } from '../common';
import { VersionService } from './version.service';

@Controller('version')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  // 保留公开访问（spec §5 白名单：/api/version 免鉴权）
  @Public()
  @Get()
  getVersion() {
    return this.versionService.getVersion();
  }
}
