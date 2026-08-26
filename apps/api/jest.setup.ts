process.env.NODE_ENV ??= 'test';
process.env.AUTH_JWT_SECRET ??= 'test-jwt-secret';
process.env.DATABASE_URL ??= 'postgresql://flowpeek:flowpeek@localhost:5432/flowpeek_test';
process.env.INITIAL_ADMIN_PASSWORD ??= 'test-password';
process.env.SHADOW_DATABASE_URL ??= 'postgresql://flowpeek:flowpeek@localhost:5432/flowpeek_shadow';
process.env.TOKEN_ENCRYPTION_KEY ??= 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
