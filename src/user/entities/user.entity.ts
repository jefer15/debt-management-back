import { Debt } from "../../debt/entities/debt.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
@PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 500 })
  name: string;

  @Column({unique: true})
  email: string

  @Column({ nullable: false, select: false })
  password: string;

  @OneToMany(() => Debt, (debt) => debt.user)
  debts: Debt[];
}