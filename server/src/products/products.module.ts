import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [DataModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
