import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateProfileDto } from './update-profile.dto.js';

describe('UpdateProfileDto', () => {
  it('accepts nullable personal names and trims every identity field', async () => {
    const input = plainToInstance(UpdateProfileDto, {
      firstName: ' Vera ',
      lastName: null,
      username: ' viewer ',
    });

    await expect(validate(input)).resolves.toHaveLength(0);
    expect(input).toMatchObject({ firstName: 'Vera', lastName: null, username: 'viewer' });
  });

  it('requires both personal-name keys and a non-empty trimmed username', async () => {
    const input = plainToInstance(UpdateProfileDto, { username: '   ' });
    const errors = await validate(input);

    expect(errors.map(({ property }) => property).sort()).toEqual(['firstName', 'lastName', 'username']);
  });
});
