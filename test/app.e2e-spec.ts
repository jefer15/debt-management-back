import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/user/entities/user.entity';
import { Debt } from '../src/debt/entities/debt.entity';
import { Repository } from 'typeorm';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let debtRepository: Repository<Debt>;
  let userToken: string;
  let userId: number;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    debtRepository = moduleFixture.get<Repository<Debt>>(getRepositoryToken(Debt));
    
    await app.init();
  });

  afterEach(async () => {
    if (debtRepository) {
      await debtRepository.query('DELETE FROM debt');
    }
    if (userRepository) {
      await userRepository.query('DELETE FROM "user"');
    }
    await app.close();
  });

  describe('Authentication', () => {
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    it('/auth/register (POST)', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBe('User created successfully');
        });
    });

    it('/auth/register (POST) - should fail with duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Email already exists');
        });
    });

    it('/auth (POST) - login', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);

      return request(app.getHttpServer())
        .post('/auth')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.token).toBeDefined();
          expect(res.body.email).toBe(testUser.email);
          expect(res.body.user).toBe(testUser.name);
        });
    });

    it('/auth (POST) - should fail with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);
        
      return request(app.getHttpServer())
        .post('/auth')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid password');
        });
    });
  });

  describe('Debts', () => {
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    const testDebt = {
      description: 'Test debt',
      amount: 100,
    };

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      userToken = loginResponse.body.token;
    });

    it('/debt (POST) - create debt', () => {
      return request(app.getHttpServer())
        .post('/debt')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testDebt)
        .expect(201)
        .expect((res) => {
          expect(res.body.description).toBe(testDebt.description);
          expect(res.body.amount).toBe(testDebt.amount);
          expect(res.body.paid).toBe(false);
          expect(res.body.id).toBeDefined();
        });
    });

    it('/debt (POST) - should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/debt')
        .send(testDebt)
        .expect(401);
    });

    it('/debt (POST) - should fail with negative amount', () => {
      return request(app.getHttpServer())
        .post('/debt')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          description: 'Invalid debt',
          amount: -100,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('El valor de la deuda debe ser mayor a 0');
        });
    });

    it('/debt (GET) - get all debts', async () => {
      await request(app.getHttpServer())
        .post('/debt')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testDebt);

      return request(app.getHttpServer())
        .get('/debt')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
          expect(res.body[0].description).toBe(testDebt.description);
        });
    });

    it('/debt?status=pending (GET) - get pending debts', async () => {
      await request(app.getHttpServer())
        .post('/debt')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testDebt);

      return request(app.getHttpServer())
        .get('/debt?status=pending')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
          expect(res.body[0].paid).toBe(false);
        });
    });

    it('/debt/summary (GET) - get debt summary', async () => {
      await request(app.getHttpServer())
        .post('/debt')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testDebt);

      return request(app.getHttpServer())
        .get('/debt/summary')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBe(100);
          expect(res.body.paid).toBe(0);
          expect(res.body.pending).toBe(100);
        });
    });

    it('/debt/:id (GET) - get specific debt', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/debt')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testDebt);

      const debtId = createResponse.body.id;

      return request(app.getHttpServer())
        .get(`/debt/${debtId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(debtId);
          expect(res.body.description).toBe(testDebt.description);
        });
    });

    it('/debt/:id (PUT) - update debt', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/debt')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testDebt);

      const debtId = createResponse.body.id;
      const updateData = {
        description: 'Updated debt',
        amount: 200,
      };

      return request(app.getHttpServer())
        .put(`/debt/${debtId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.description).toBe(updateData.description);
          expect(res.body.amount).toBe(updateData.amount);
        });
    });

    it('/debt/:id/pay (PATCH) - mark debt as paid', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/debt')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testDebt);

      const debtId = createResponse.body.id;

      return request(app.getHttpServer())
        .patch(`/debt/${debtId}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.paid).toBe(true);
        });
    });

    it('/debt/export/json (GET) - export debts as JSON', async () => {
      await request(app.getHttpServer())
        .post('/debt')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testDebt);

      return request(app.getHttpServer())
        .get('/debt/export/json')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
        });
    });

    it('/debt/export/csv (GET) - export debts as CSV', async () => {
      await request(app.getHttpServer())
        .post('/debt')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testDebt);

      return request(app.getHttpServer())
        .get('/debt/export/csv')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.csv).toBeDefined();
          expect(typeof res.body.csv).toBe('string');
        });
    });

    it('/debt/:id (DELETE) - delete debt', async () => {

      const createResponse = await request(app.getHttpServer())
        .post('/debt')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testDebt);

      const debtId = createResponse.body.id;

      return request(app.getHttpServer())
        .delete(`/debt/${debtId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });
});