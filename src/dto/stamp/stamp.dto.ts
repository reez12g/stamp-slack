import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class StampDTO {
  @IsOptional()
  @IsString()
  token: string;

  @IsString()
  @IsNotEmpty()
  team_id: string;

  @IsString()
  @IsNotEmpty()
  team_domain: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  enterprise_id: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  enterprise_name: string;

  @IsString()
  @IsNotEmpty()
  channel_id: string;

  @IsString()
  @IsNotEmpty()
  channel_name: string;

  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  user_name: string;

  @IsString()
  @IsNotEmpty()
  command: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
  })
  response_url: string;

  @IsOptional()
  @IsString()
  trigger_id: string;
}
