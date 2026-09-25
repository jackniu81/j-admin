import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [DataModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
