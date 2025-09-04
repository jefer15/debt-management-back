import { Module } from '@nestjs/common';
import { DebtService } from './debt.service';
import { DebtController } from './debt.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Debt } from './entities/debt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Debt])],
  controllers: [DebtController],
  providers: [DebtService],
  exports: [DebtService],
})
export class DebtModule {}
