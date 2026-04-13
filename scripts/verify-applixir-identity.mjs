const {
  APPLIXIR_USER_ID_PATTERN,
  createApplixirUserId,
  isValidApplixirUserId,
  resolveApplixirUserId,
} = await import('../services/rewards/applixirIdentity.ts');

const firebaseUid = 'QOr9JQEWUFYoeB6FVlsvWEKZvgJ2';
const validUuid = '123e4567-e89b-42d3-a456-426614174000';

if (isValidApplixirUserId(firebaseUid)) {
  throw new Error('Firebase UID must not be accepted as an AppLixir userId.');
}

if (!isValidApplixirUserId(validUuid)) {
  throw new Error('A valid UUIDv4-shaped AppLixir userId should be accepted.');
}

const generated = createApplixirUserId();
if (!APPLIXIR_USER_ID_PATTERN.test(generated)) {
  throw new Error(`Generated AppLixir userId is not UUIDv4-shaped: ${generated}`);
}

const resolved = resolveApplixirUserId(firebaseUid, validUuid);
if (resolved !== validUuid) {
  throw new Error(`Expected resolver to skip invalid candidates and return ${validUuid}, got ${resolved}`);
}

console.log('verify-applixir-identity: passed');
