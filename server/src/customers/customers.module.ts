import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [DataModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
