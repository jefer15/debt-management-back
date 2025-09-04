import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt } from './entities/debt.entity';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { User } from '../user/entities/user.entity';
import { Parser } from 'json2csv';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
@Injectable()
export class DebtService {
  constructor(
    @InjectRepository(Debt)
    private debtRepo: Repository<Debt>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) { }

  async create(createDebtDto: CreateDebtDto, user: User) {
    if (createDebtDto.amount <= 0) {
      throw new BadRequestException('El valor de la deuda debe ser mayor a 0');
    }
    const debt = this.debtRepo.create({ ...createDebtDto, user });
    const savedDebt = await this.debtRepo.save(debt);

    await this.invalidateUserCache(user.id);

    return savedDebt;
  }

  async findAll(userId: number, status: 'all' | 'completed' | 'pending' = 'all') {
    const cacheKey = `debts_user_${userId}_${status}`;

    let debts = await this.cacheManager.get<Debt[]>(cacheKey);

    if (!debts) {
      const where: any = { user: { id: userId } };

      if (status === 'completed') {
        where.paid = true;
      } else if (status === 'pending') {
        where.paid = false;
      }
      // 👆 si es "all", no le agregamos filtro a paid

      debts = await this.debtRepo.find({
        where,
        order: { createdAt: 'DESC' },
      });

      await this.cacheManager.set(cacheKey, debts, 300000);
    }

    return debts;
  }


  async findOne(id: number, userId: number) {
    const cacheKey = `debt_${id}_user_${userId}`;

    let debt = await this.cacheManager.get<Debt>(cacheKey);

    if (!debt) {
      const foundDebt = await this.debtRepo.findOne({
        where: { id, user: { id: userId } },
      });

      if (!foundDebt) throw new NotFoundException('Deuda no encontrada');

      debt = foundDebt;

      await this.cacheManager.set(cacheKey, debt, 300000);
    }

    return debt;
  }

  async update(id: number, userId: number, dto: UpdateDebtDto) {
    const debt = await this.findOne(id, userId);

    if (debt.paid) {
      throw new BadRequestException('No se puede modificar una deuda pagada');
    }

    if (dto.amount && dto.amount <= 0) {
      throw new BadRequestException('El valor de la deuda debe ser mayor a 0');
    }

    Object.assign(debt, dto);
    const updatedDebt = await this.debtRepo.save(debt);

    await this.invalidateUserCache(userId);
    await this.cacheManager.del(`debt_${id}_user_${userId}`);

    return updatedDebt;
  }

  async markAsPaid(id: number, userId: number) {
    const debt = await this.findOne(id, userId);

    if (debt.paid) {
      throw new BadRequestException('Ya está pagada');
    }

    debt.paid = true;
    const updatedDebt = await this.debtRepo.save(debt);

    await this.invalidateUserCache(userId);
    await this.cacheManager.del(`debt_${id}_user_${userId}`);

    return updatedDebt;
  }

  async exportDebts(userId: number, format: 'json' | 'csv') {
    const debts = await this.findAll(userId);

    if (format === 'json') {
      return debts;
    } else if (format === 'csv') {
      const parser = new Parser({
        fields: ['id', 'description', 'amount', 'paid', 'createdAt']
      });
      return parser.parse(debts);
    }
  }

  async getSummary(userId: number) {
    const cacheKey = `summary_user_${userId}`;

    let summary = await this.cacheManager.get(cacheKey);

    if (!summary) {
      const [total, paid, pending] = await Promise.all([
        this.debtRepo.sum('amount', { user: { id: userId } }),
        this.debtRepo.sum('amount', { user: { id: userId }, paid: true }),
        this.debtRepo.sum('amount', { user: { id: userId }, paid: false }),
      ]);

      summary = {
        total: total || 0,
        paid: paid || 0,
        pending: pending || 0
      };

      await this.cacheManager.set(cacheKey, summary, 120000);
    }

    return summary;
  }

  private async invalidateUserCache(userId: number) {
    await Promise.all([
      this.cacheManager.del(`debts_user_${userId}_all`),
      this.cacheManager.del(`debts_user_${userId}_completed`),
      this.cacheManager.del(`debts_user_${userId}_pending`),
      this.cacheManager.del(`summary_user_${userId}`),
    ]);
  }

}
