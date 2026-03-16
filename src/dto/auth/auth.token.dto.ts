import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TempAuthTokenDTO {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsOptional()
  @IsString()
  @IsIn(['json'])
  format?: string;
}
