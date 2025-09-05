import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
      };

      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(mockRepository.save).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });

    it('should handle repository errors', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
      };

      const error = new Error('Database error');
      mockRepository.save.mockRejectedValue(error);

      await expect(service.create(createUserDto)).rejects.toThrow('Database error');
    });
  });

  describe('findOneByEmail', () => {
    it('should find user by email successfully', async () => {
      const email = 'test@example.com';
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOneByEmail(email);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email },
        select: ['id', 'name', 'email', 'password'],
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      const email = 'nonexistent@example.com';
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOneByEmail(email);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email },
        select: ['id', 'name', 'email', 'password'],
      });
      expect(result).toBeNull();
    });
  });

  describe('findOneById', () => {
    it('should find user by id successfully', async () => {
      const id = 1;
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOneById(id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by id', async () => {
      const id = 999;
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOneById(id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toBeNull();
    });
  });
});