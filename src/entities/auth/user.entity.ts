import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryColumn()
  id: string;

  @Column()
  scope: string;

  @Column()
  access_token: string;
}
