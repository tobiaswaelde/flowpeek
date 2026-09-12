import { IsUrl, MaxLength } from 'class-validator';

/** Remote avatar source accepted for a protected preview download. */
export class RemoteAvatarDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  url!: string;
}
