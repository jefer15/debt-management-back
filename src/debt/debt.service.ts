import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt } from './entities/debt.entity';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { User } from '../user/entities/user.entity';
import { Parser } from 'json2csv';

@Injectable()
export class DebtService {
  constructor(
    @InjectRepository(Debt)
    private debtRepo: Repository<Debt>,
  ) { }

  async create(createDebtDto: CreateDebtDto, user: User) {
    if (createDebtDto.amount <= 0) {
      throw new BadRequestException('El valor de la deuda debe ser mayor a 0');
    }
    const debt = this.debtRepo.create({ ...createDebtDto, user });
    return this.debtRepo.save(debt);
  }

  async findAllByUser(userId: number) {
    return this.debtRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, userId: number) {
    const debt = await this.debtRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!debt) throw new NotFoundException('Deuda no encontrada');
    return debt;
  }

  async update(id: number, userId: number, dto: UpdateDebtDto) {
    const debt = await this.findOne(id, userId);
    if (debt.paid) {
      throw new BadRequestException('No se puede modificar una deuda pagada');
    }
    Object.assign(debt, dto);
    return this.debtRepo.save(debt);
  }

  async markAsPaid(id: number, userId: number) {
    const debt = await this.findOne(id, userId);
    if (debt.paid) throw new BadRequestException('Ya está pagada');
    debt.paid = true;
    return this.debtRepo.save(debt);
  }

  async remove(id: number, userId: number) {
    const debt = await this.findOne(id, userId);
    return this.debtRepo.remove(debt);
  }

  async exportDebts(userId: number, format: 'json' | 'csv') {
    const debts = await this.findAllByUser(userId);

    if (format === 'json') {
      return debts;
    } else if (format === 'csv') {
      const parser = new Parser();
      return parser.parse(debts);
    }
  }

  async getSummary(userId: number) {
    const [total, paid, pending] = await Promise.all([
      this.debtRepo.sum('amount', { user: { id: userId } }),
      this.debtRepo.sum('amount', { user: { id: userId }, paid: true }),
      this.debtRepo.sum('amount', { user: { id: userId }, paid: false }),
    ]);

    return { total, paid, pending };
  }
}
