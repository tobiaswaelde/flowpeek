import { IsString, MaxLength, MinLength } from 'class-validator';

export class SignInDto {
  @IsString()
  @MaxLength(255)
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
