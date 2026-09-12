import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(256)
  newPassword!: string;
}
