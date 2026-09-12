import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import sharp from 'sharp';

import { AvatarService } from './avatar.service.js';

describe('AvatarService', () => {
  const updatedAt = new Date('2026-09-12T10:00:00.000Z');
  const prisma = {
    userAvatar: {
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn().mockResolvedValue({ updatedAt }),
    },
  };
  const service = new AvatarService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('normalizes uploaded images to a metadata-free 256 pixel WebP', async () => {
    const source = await sharp({
      create: { background: '#79c1b6', channels: 3, height: 200, width: 400 },
    })
      .png()
      .withMetadata({ exif: { IFD0: { Copyright: 'must be removed' } } })
      .toBuffer();

    await expect(service.save('user-id', { data: source, mimeType: 'image/png' })).resolves.toBe(updatedAt);

    const create = prisma.userAvatar.upsert.mock.calls[0]?.[0].create as { data: Uint8Array; etag: string };
    const metadata = await sharp(create.data).metadata();
    expect(metadata).toMatchObject({ format: 'webp', height: 256, width: 256 });
    expect(metadata.exif).toBeUndefined();
    expect(create.etag).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects files over two megabytes before decoding', async () => {
    await expect(
      service.save('user-id', { data: Buffer.alloc(2 * 1024 * 1024 + 1), mimeType: 'image/png' }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('rejects a declared image type that does not match the encoded data', async () => {
    const source = await sharp({ create: { background: 'white', channels: 3, height: 10, width: 10 } })
      .png()
      .toBuffer();
    await expect(service.save('user-id', { data: source, mimeType: 'image/jpeg' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('blocks insecure and private remote avatar targets', async () => {
    await expect(service.download('http://example.com/avatar.png')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.download('https://127.0.0.1/avatar.png')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.download('https://[::1]/avatar.png')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes and retrieves stored avatar records without loading a user', async () => {
    prisma.userAvatar.findUnique.mockResolvedValue({ data: new Uint8Array([1, 2, 3]), etag: 'etag' });
    await expect(service.get('user-id')).resolves.toEqual({ data: new Uint8Array([1, 2, 3]), etag: 'etag' });
    await service.remove('user-id');
    expect(prisma.userAvatar.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-id' } });
  });
});
