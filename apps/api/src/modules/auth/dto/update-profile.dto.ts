import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

/** Editable personal identity fields for the current authenticated user. */
export class UpdateProfileDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(255)
  firstName!: string | null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(255)
  lastName!: string | null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  username!: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;
}
