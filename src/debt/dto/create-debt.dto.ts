import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateDebtDto {
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsPositive({ message: 'El valor de la deuda debe ser mayor que 0' })
  amount: number;
}
