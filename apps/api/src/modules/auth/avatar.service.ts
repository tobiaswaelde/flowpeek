import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { BlockList, isIP } from 'node:net';

import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import sharp from 'sharp';

import { PrismaService } from '../../prisma/prisma.service.js';

const avatarDimension = 256;
const maximumInputBytes = 2 * 1024 * 1024;
const maximumInputPixels = 16_777_216;
const maximumRedirects = 3;
const remoteTimeoutMs = 10_000;
const supportedFormats = new Map([
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
]);

const blockedAddresses = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blockedAddresses.addSubnet(network, prefix, 'ipv6');
}

export interface AvatarSource {
  data: Buffer;
  mimeType: string;
}

/** Validates, normalizes, stores, and retrieves user avatar images. */
@Injectable()
export class AvatarService {
  constructor(private readonly prisma: PrismaService) {}

  /** Validate and persist one user's avatar as a normalized WebP image. */
  async save(userId: string, source: AvatarSource): Promise<Date> {
    const normalized = await this.normalize(source);
    const etag = createHash('sha256').update(normalized).digest('hex');
    const avatar = await this.prisma.userAvatar.upsert({
      where: { userId },
      create: { data: new Uint8Array(normalized), etag, userId },
      update: { data: new Uint8Array(normalized), etag },
    });
    return avatar.updatedAt;
  }

  /** Remove the current user's stored avatar when present. */
  async remove(userId: string): Promise<void> {
    await this.prisma.userAvatar.deleteMany({ where: { userId } });
  }

  /** Load normalized avatar bytes without exposing other user data. */
  async get(userId: string): Promise<{ data: Uint8Array; etag: string }> {
    const avatar = await this.prisma.userAvatar.findUnique({ where: { userId }, select: { data: true, etag: true } });
    if (!avatar) throw new NotFoundException('Avatar not found.');
    return avatar;
  }

  /** Download and validate a remote HTTPS image without persisting it. */
  async download(sourceUrl: string): Promise<AvatarSource> {
    try {
      return await this.downloadRedirect(new URL(sourceUrl), 0);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException('The avatar URL could not be downloaded.');
    }
  }

  private async normalize(source: AvatarSource): Promise<Buffer> {
    await this.assertValidSource(source);
    try {
      return await sharp(source.data, { animated: false, failOn: 'error', limitInputPixels: maximumInputPixels })
        .rotate()
        .resize(avatarDimension, avatarDimension, { fit: 'cover', position: 'centre' })
        .webp({ effort: 4, quality: 82 })
        .toBuffer();
    } catch {
      throw new BadRequestException('The avatar image could not be processed.');
    }
  }

  private async assertValidSource(source: AvatarSource): Promise<void> {
    if (source.data.length === 0) throw new BadRequestException('The avatar image is empty.');
    if (source.data.length > maximumInputBytes)
      throw new PayloadTooLargeException('Avatar images may not exceed 2 MB.');
    if (![...supportedFormats.values()].includes(source.mimeType)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP avatar images are supported.');
    }

    try {
      const metadata = await sharp(source.data, {
        animated: false,
        failOn: 'error',
        limitInputPixels: maximumInputPixels,
      }).metadata();
      const detectedMimeType = metadata.format ? supportedFormats.get(metadata.format) : undefined;
      if (!detectedMimeType || detectedMimeType !== source.mimeType) {
        throw new BadRequestException('The avatar content does not match its declared image type.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('The avatar image is invalid or exceeds the supported dimensions.');
    }
  }

  private async downloadRedirect(url: URL, redirectCount: number): Promise<AvatarSource> {
    if (url.protocol !== 'https:' || url.port || url.username || url.password) {
      throw new BadRequestException('Avatar URLs must use HTTPS on port 443 and may not contain credentials.');
    }
    if (redirectCount > maximumRedirects) throw new BadRequestException('The avatar URL redirected too many times.');

    const address = await this.resolvePublicAddress(url.hostname);
    return new Promise<AvatarSource>((resolve, reject) => {
      const remoteRequest = request(
        {
          hostname: address.address,
          path: `${url.pathname}${url.search}`,
          protocol: 'https:',
          servername: url.hostname,
          headers: {
            Accept: 'image/jpeg, image/png, image/webp',
            Host: url.host,
            'User-Agent': 'ezRepo-avatar-import/1.0',
          },
        },
        (response) => {
          const statusCode = response.statusCode ?? 0;
          const location = response.headers.location;
          if (statusCode >= 300 && statusCode < 400 && location) {
            response.resume();
            try {
              void this.downloadRedirect(new URL(location, url), redirectCount + 1).then(resolve, reject);
            } catch {
              reject(new BadGatewayException('The avatar URL returned an invalid redirect.'));
            }
            return;
          }
          if (statusCode < 200 || statusCode >= 300) {
            response.resume();
            reject(new BadGatewayException(`The avatar URL returned HTTP ${statusCode}.`));
            return;
          }

          const declaredLength = Number(response.headers['content-length'] ?? 0);
          if (declaredLength > maximumInputBytes) {
            response.destroy();
            reject(new PayloadTooLargeException('Avatar images may not exceed 2 MB.'));
            return;
          }

          const mimeType = String(response.headers['content-type'] ?? '')
            .split(';', 1)[0]
            ?.trim()
            .toLowerCase();
          if (![...supportedFormats.values()].includes(mimeType)) {
            response.destroy();
            reject(new BadRequestException('Only JPEG, PNG, and WebP avatar images are supported.'));
            return;
          }

          const chunks: Buffer[] = [];
          let receivedBytes = 0;
          response.on('data', (chunk: Buffer) => {
            receivedBytes += chunk.length;
            if (receivedBytes > maximumInputBytes) {
              response.destroy(new PayloadTooLargeException('Avatar images may not exceed 2 MB.'));
              return;
            }
            chunks.push(chunk);
          });
          response.on('end', () => {
            const source = { data: Buffer.concat(chunks), mimeType };
            void this.assertValidSource(source).then(() => resolve(source), reject);
          });
          response.on('error', reject);
        },
      );
      remoteRequest.setTimeout(remoteTimeoutMs, () => {
        remoteRequest.destroy(new BadGatewayException('The avatar URL timed out.'));
      });
      remoteRequest.on('error', reject);
      remoteRequest.end();
    });
  }

  private async resolvePublicAddress(hostname: string): Promise<{ address: string; family: 4 | 6 }> {
    const normalizedHostname = hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(normalizedHostname)
      ? [{ address: normalizedHostname, family: isIP(normalizedHostname) as 4 | 6 }]
      : await lookup(normalizedHostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address, family }) => this.isBlockedAddress(address, family))) {
      throw new BadRequestException('The avatar URL must resolve only to public internet addresses.');
    }
    return addresses[0] as { address: string; family: 4 | 6 };
  }

  private isBlockedAddress(address: string, family: number): boolean {
    if (family === 6 && address.toLowerCase().startsWith('::ffff:')) {
      const mappedAddress = address.slice(address.lastIndexOf(':') + 1);
      return isIP(mappedAddress) !== 4 || blockedAddresses.check(mappedAddress, 'ipv4');
    }
    return blockedAddresses.check(address, family === 6 ? 'ipv6' : 'ipv4');
  }
}
