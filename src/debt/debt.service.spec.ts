import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DebtService } from './debt.service';
import { Debt } from './entities/debt.entity';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';

describe('DebtService', () => {
  let service: DebtService;
  let repository: Repository<Debt>;
  let cacheManager: Cache;

  const mockDebt = {
    id: 1,
    description: 'Test debt',
    amount: 100,
    paid: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 1 }
  } as Debt;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    sum: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DebtService,
        {
          provide: getRepositoryToken(Debt),
          useValue: mockRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<DebtService>(DebtService);
    repository = module.get<Repository<Debt>>(getRepositoryToken(Debt));
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new debt successfully', async () => {
      const createDebtDto: CreateDebtDto = {
        description: 'Test debt',
        amount: 100,
      };
      const userLogged = 1;

      mockRepository.create.mockReturnValue(mockDebt);
      mockRepository.save.mockResolvedValue(mockDebt);

      const result = await service.create(createDebtDto, userLogged);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDebtDto,
        user: { id: userLogged },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockDebt);
      expect(result).toEqual(mockDebt);
    });

    it('should throw BadRequestException for negative amount', async () => {
      const createDebtDto: CreateDebtDto = {
        description: 'Test debt',
        amount: -100,
      };
      const userLogged = 1;

      await expect(service.create(createDebtDto, userLogged)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDebtDto, userLogged)).rejects.toThrow(
        'El valor de la deuda debe ser mayor a 0',
      );
    });

    it('should throw BadRequestException for zero amount', async () => {
      const createDebtDto: CreateDebtDto = {
        description: 'Test debt',
        amount: 0,
      };
      const userLogged = 1;

      await expect(service.create(createDebtDto, userLogged)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    const userId = 1;
    const mockDebts = [mockDebt];

    it('should return debts from cache if available', async () => {
      mockCacheManager.get.mockResolvedValue(mockDebts);

      const result = await service.findAll(userId);

      expect(mockCacheManager.get).toHaveBeenCalledWith('debts_user_1_all');
      expect(result).toEqual(mockDebts);
      expect(mockRepository.find).not.toHaveBeenCalled();
    });

    it('should fetch debts from database and cache them', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue(mockDebts);

      const result = await service.findAll(userId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user: { id: userId } },
        order: { createdAt: 'DESC' },
      });
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'debts_user_1_all',
        mockDebts,
        300000,
      );
      expect(result).toEqual(mockDebts);
    });

    it('should filter by completed status', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue(mockDebts);

      await service.findAll(userId, 'completed');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user: { id: userId }, paid: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter by pending status', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue(mockDebts);

      await service.findAll(userId, 'pending');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user: { id: userId }, paid: false },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    const debtId = 1;
    const userId = 1;

    it('should return debt from cache if available', async () => {
      mockCacheManager.get.mockResolvedValue(mockDebt);

      const result = await service.findOne(debtId, userId);

      expect(mockCacheManager.get).toHaveBeenCalledWith('debt_1_user_1');
      expect(result).toEqual(mockDebt);
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch debt from database and cache it', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(mockDebt);

      const result = await service.findOne(debtId, userId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: debtId, user: { id: userId } },
      });
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'debt_1_user_1',
        mockDebt,
        300000,
      );
      expect(result).toEqual(mockDebt);
    });

    it('should throw NotFoundException when debt not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(debtId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(debtId, userId)).rejects.toThrow(
        'Deuda no encontrada',
      );
    });
  });

  describe('update', () => {
    const debtId = 1;
    const userId = 1;
    const updateDebtDto: UpdateDebtDto = {
      description: 'Updated debt',
      amount: 200,
    };

    it('should update debt successfully', async () => {
      const updatedDebt = { ...mockDebt, ...updateDebtDto };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDebt);
      mockRepository.save.mockResolvedValue(updatedDebt);

      const result = await service.update(debtId, userId, updateDebtDto);

      expect(service.findOne).toHaveBeenCalledWith(debtId, userId);
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockDebt,
        ...updateDebtDto,
      });
      expect(result).toEqual(updatedDebt);
    });

    it('should throw BadRequestException when trying to update paid debt', async () => {
      const paidDebt = { ...mockDebt, paid: true };
      jest.spyOn(service, 'findOne').mockResolvedValue(paidDebt);

      await expect(service.update(debtId, userId, updateDebtDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(debtId, userId, updateDebtDto)).rejects.toThrow(
        'No se puede modificar una deuda pagada',
      );
    });

    it('should throw BadRequestException for negative amount', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockDebt);
      const invalidDto: UpdateDebtDto = { amount: -100 };

      await expect(service.update(debtId, userId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markAsPaid', () => {
    const debtId = 1;
    const userId = 1;

    it('should mark debt as paid successfully', async () => {
      const paidDebt = { ...mockDebt, paid: true } as Debt;

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDebt as Debt);
      mockRepository.save.mockResolvedValue(paidDebt);

      const result = await service.markAsPaid(debtId, userId);

      expect(service.findOne).toHaveBeenCalledWith(debtId, userId);
      expect(mockRepository.save).toHaveBeenCalledWith({ ...mockDebt, paid: true });
      expect(result).toEqual(paidDebt);
    });

    it('should throw BadRequestException when debt is already paid', async () => {
      const paidDebt = { ...mockDebt, paid: true } as Debt;
      jest.spyOn(service, 'findOne').mockResolvedValue(paidDebt);

      await expect(service.markAsPaid(debtId, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.markAsPaid(debtId, userId)).rejects.toThrow(
        'Ya está pagada',
      );
    });
  });

  describe('remove', () => {
    it('should remove debt successfully', async () => {
      const debtId = 1;
      const userId = 1;

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDebt as Debt);

      await service.remove(debtId, userId);

      expect(service.findOne).toHaveBeenCalledWith(debtId, userId);
      expect(mockRepository.remove).toHaveBeenCalledWith(mockDebt);
    });
  });

  describe('exportDebts', () => {
    const userId = 1;
    const mockDebts = [mockDebt as Debt];

    it('should export debts as JSON', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue(mockDebts);

      const result = await service.exportDebts(userId, 'json');

      expect(service.findAll).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockDebts);
    });

    it('should export debts as CSV', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue(mockDebts);

      const result = await service.exportDebts(userId, 'csv');

      expect(service.findAll).toHaveBeenCalledWith(userId);
      expect(typeof result).toBe('string');
    });
  });

  describe('getSummary', () => {
    const userId = 1;
    const mockSummary = {
      total: 300,
      paid: 100,
      pending: 200,
    };

    it('should return summary from cache if available', async () => {
      mockCacheManager.get.mockResolvedValue(mockSummary);

      const result = await service.getSummary(userId);

      expect(mockCacheManager.get).toHaveBeenCalledWith('summary_user_1');
      expect(result).toEqual(mockSummary);
    });

    it('should calculate and cache summary', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.sum
        .mockResolvedValueOnce(300)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(200);

      const result = await service.getSummary(userId);

      expect(mockRepository.sum).toHaveBeenCalledTimes(3);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'summary_user_1',
        mockSummary,
        120000,
      );
      expect(result).toEqual(mockSummary);
    });

    it('should handle null values from database', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.sum
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await service.getSummary(userId);

      expect(result).toEqual({
        total: 0,
        paid: 0,
        pending: 0,
      });
    });
  });
});