import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCatDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  age: number;

  @IsString()
  @IsOptional()
  breed?: string;
}
