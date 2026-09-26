import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [DataModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
