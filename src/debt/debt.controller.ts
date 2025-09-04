import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards, Req, Query, Put } from '@nestjs/common';
import { DebtService } from './debt.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { AuthGuard } from '../auth/guard/auth.guard';

@Controller('debt')
@UseGuards(AuthGuard)
export class DebtController {
  constructor(private readonly debtService: DebtService) { }

  @Post()
  create(@Body() dto: CreateDebtDto, @Req() req) {
    console.log(req.user);    
    return this.debtService.create(dto, req.user.sub);
  }

  @Get()
  findAll(@Req() req, @Query('status') status: 'all' | 'completed' | 'pending' = 'all') {
    return this.debtService.findAll(req.user.sub, status);
  }

  @Get('summary')
  getSummary(@Req() req) {
    return this.debtService.getSummary(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: number, @Req() req) {
    return this.debtService.findOne(id, req.user.sub);
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() dto: UpdateDebtDto, @Req() req) {
    return this.debtService.update(id, req.user.sub, dto);
  }

  @Patch(':id/pay')
  markAsPaid(@Param('id') id: number, @Req() req) {
    return this.debtService.markAsPaid(id, req.user.sub);
  }

  @Get('export/:format')
  async exportDebts(@Param('format') format: string, @Req() req) {
    const data = await this.debtService.exportDebts(req.user.sub, format as 'json' | 'csv');
    if (format === 'csv') {
      return { csv: data };
    }
    return data;
  }

  @Delete(':id')
  remove(@Param('id') id: number, @Req() req) {
    return this.debtService.remove(id, req.user.sub);
  }
}
