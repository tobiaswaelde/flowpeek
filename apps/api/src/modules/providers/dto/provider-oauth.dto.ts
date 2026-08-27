import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/** Payload used to start a provider OAuth authorization. */
export class StartProviderOAuthDto {
  @IsEnum(['GITHUB', 'GITLAB', 'FORGEJO']) providerType!: 'GITHUB' | 'GITLAB' | 'FORGEJO';

  @IsString() @MaxLength(255) displayName!: string;
}

/** A browser destination returned when an OAuth authorization is started. */
export interface ProviderOAuthAuthorizationDto {
  authorizationUrl: string;
}

/** Query parameters returned by an OAuth provider after an authorization attempt. */
export class ProviderOAuthCallbackDto {
  @IsString() @MaxLength(4096) state!: string;

  @IsOptional() @IsString() @MaxLength(4096) code?: string;

  @IsOptional() @IsString() @MaxLength(255) error?: string;

  @IsOptional() @IsString() @MaxLength(4096) error_description?: string;

  @IsOptional() @IsString() @MaxLength(4096) error_uri?: string;
}
