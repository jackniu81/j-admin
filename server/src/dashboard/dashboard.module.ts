import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [DataModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
