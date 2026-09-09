import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

/** Personal interface preferences returned to the authenticated user. */
export class UserPreferencesDto {
  @ApiProperty({
    description: 'Stable identifiers for introductory page banners dismissed by the current user.',
    example: ['dashboard', 'workflow-runs'],
    isArray: true,
    type: String,
  })
  dismissedIntroBannerIds!: string[];
}

/** Route parameters accepted when dismissing one introductory page banner. */
export class IntroBannerParamsDto {
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @ApiProperty({ example: 'dashboard', maxLength: 100, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' })
  bannerId!: string;
}
