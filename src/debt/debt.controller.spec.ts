import { Test, TestingModule } from '@nestjs/testing';
import { DebtController } from './debt.controller';
import { DebtService } from './debt.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('DebtController', () => {
  let controller: DebtController;
  let service: DebtService;

  const mockDebt = {
    id: 1,
    description: 'Test debt',
    amount: 100,
    paid: false,
    createdAt: new Date(),
    user: { id: 1 },
  };

  const mockRequest = {
    user: {
      sub: 1,
      email: 'test@example.com',
    },
  };

  const mockDebtService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    markAsPaid: jest.fn(),
    remove: jest.fn(),
    exportDebts: jest.fn(),
    getSummary: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn().mockReturnValue({ sub: 1, email: 'test@example.com' }),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DebtController],
      providers: [
        {
          provide: DebtService,
          useValue: mockDebtService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<DebtController>(DebtController);
    service = module.get<DebtService>(DebtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new debt', async () => {
      const createDebtDto: CreateDebtDto = {
        description: 'Test debt',
        amount: 100,
      };

      mockDebtService.create.mockResolvedValue(mockDebt);

      const result = await controller.create(createDebtDto, mockRequest);

      expect(mockDebtService.create).toHaveBeenCalledWith(
        createDebtDto,
        mockRequest.user.sub,
      );
      expect(result).toEqual(mockDebt);
    });
  });

  describe('findAll', () => {
    it('should return all debts with default status', async () => {
      const mockDebts = [mockDebt];
      mockDebtService.findAll.mockResolvedValue(mockDebts);

      const result = await controller.findAll(mockRequest, 'all');

      expect(mockDebtService.findAll).toHaveBeenCalledWith(
        mockRequest.user.sub,
        'all',
      );
      expect(result).toEqual(mockDebts);
    });

    it('should return debts filtered by status', async () => {
      const mockDebts = [mockDebt];
      mockDebtService.findAll.mockResolvedValue(mockDebts);

      const result = await controller.findAll(mockRequest, 'pending');

      expect(mockDebtService.findAll).toHaveBeenCalledWith(
        mockRequest.user.sub,
        'pending',
      );
      expect(result).toEqual(mockDebts);
    });
  });

  describe('getSummary', () => {
    it('should return debt summary', async () => {
      const mockSummary = {
        total: 300,
        paid: 100,
        pending: 200,
      };

      mockDebtService.getSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSummary(mockRequest);

      expect(mockDebtService.getSummary).toHaveBeenCalledWith(
        mockRequest.user.sub,
      );
      expect(result).toEqual(mockSummary);
    });
  });

  describe('findOne', () => {
    it('should return a specific debt', async () => {
      const debtId = 1;
      mockDebtService.findOne.mockResolvedValue(mockDebt);

      const result = await controller.findOne(debtId, mockRequest);

      expect(mockDebtService.findOne).toHaveBeenCalledWith(
        debtId,
        mockRequest.user.sub,
      );
      expect(result).toEqual(mockDebt);
    });
  });

  describe('update', () => {
    it('should update a debt', async () => {
      const debtId = 1;
      const updateDebtDto: UpdateDebtDto = {
        description: 'Updated debt',
        amount: 200,
      };
      const updatedDebt = { ...mockDebt, ...updateDebtDto };

      mockDebtService.update.mockResolvedValue(updatedDebt);

      const result = await controller.update(debtId, updateDebtDto, mockRequest);

      expect(mockDebtService.update).toHaveBeenCalledWith(
        debtId,
        mockRequest.user.sub,
        updateDebtDto,
      );
      expect(result).toEqual(updatedDebt);
    });
  });

  describe('markAsPaid', () => {
    it('should mark debt as paid', async () => {
      const debtId = 1;
      const paidDebt = { ...mockDebt, paid: true };

      mockDebtService.markAsPaid.mockResolvedValue(paidDebt);

      const result = await controller.markAsPaid(debtId, mockRequest);

      expect(mockDebtService.markAsPaid).toHaveBeenCalledWith(
        debtId,
        mockRequest.user.sub,
      );
      expect(result).toEqual(paidDebt);
    });
  });

  describe('exportDebts', () => {
    it('should export debts as JSON', async () => {
      const mockDebts = [mockDebt];
      mockDebtService.exportDebts.mockResolvedValue(mockDebts);

      const result = await controller.exportDebts('json', mockRequest);

      expect(mockDebtService.exportDebts).toHaveBeenCalledWith(
        mockRequest.user.sub,
        'json',
      );
      expect(result).toEqual(mockDebts);
    });

    it('should export debts as CSV', async () => {
      const csvData = 'id,description,amount,paid,createdAt\n1,Test debt,100,false,2023-01-01';
      mockDebtService.exportDebts.mockResolvedValue(csvData);

      const result = await controller.exportDebts('csv', mockRequest);

      expect(mockDebtService.exportDebts).toHaveBeenCalledWith(
        mockRequest.user.sub,
        'csv',
      );
      expect(result).toEqual({ csv: csvData });
    });
  });

  describe('remove', () => {
    it('should remove a debt', async () => {
      const debtId = 1;
      mockDebtService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(debtId, mockRequest);

      expect(mockDebtService.remove).toHaveBeenCalledWith(
        debtId,
        mockRequest.user.sub,
      );
      expect(result).toBeUndefined();
    });
  });
});