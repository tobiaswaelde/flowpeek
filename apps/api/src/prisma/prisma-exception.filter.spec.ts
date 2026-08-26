import { HttpStatus } from '@nestjs/common';

import { mapPrismaException } from './prisma-exception.filter.js';

describe('mapPrismaException', () => {
  it.each([
    ['P2002', HttpStatus.CONFLICT, 'A record with this value already exists.'],
    ['P2003', HttpStatus.CONFLICT, 'This record is still referenced by another resource.'],
    ['P2025', HttpStatus.NOT_FOUND, 'The requested resource does not exist.'],
  ])('maps %s to the expected HTTP response', (code, status, message) => {
    expect(mapPrismaException({ code } as never)).toMatchObject({ status, message });
  });

  it('does not expose unknown database error details', () => {
    expect(mapPrismaException({ code: 'P9999' } as never)).toEqual({
      error: 'Database error',
      message: 'The database request could not be completed.',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });
});
