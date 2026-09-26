import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [DataModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
