// ─── Profile Customisation Acceptance Tests ───────────────────────────────────
// US-52 Edit profile details and upload a profile picture

let profileDb = {};

global.updateProfile = async (userId, updates) => {
  if (!updates.displayName || updates.displayName.trim() === '') {
    return { success: false, error: 'Name is required and cannot be empty.' };
  }
  if (updates.displayName.trim().length > 30) {
    return { success: false, error: 'Name too long — max 30 characters.' };
  }
  profileDb[userId] = {
    ...profileDb[userId],
    displayName: updates.displayName.trim(),
    bio: updates.bio?.trim() ?? profileDb[userId]?.bio ?? '',
  };
  return { success: true };
};

global.updateProfilePhoto = async (userId, file) => {
  const lower = file.uri.toLowerCase();
  const isValidType =
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp');
  if (!isValidType) {
    return { success: false, error: 'Invalid file format. Please upload a JPG or PNG.' };
  }
  if (file.sizeBytes > 5 * 1024 * 1024) {
    return { success: false, error: 'File too large — max 5 MB allowed.' };
  }
  profileDb[userId] = { ...profileDb[userId], photoUrl: file.uri };
  return { success: true };
};

global.getProfile = async (userId) => profileDb[userId] ?? null;

describe('US-52 | Edit Profile Details and Upload Profile Picture', () => {

  beforeEach(() => {
    profileDb = {
      'user-001': { displayName: 'OldName', bio: 'Old bio', photoUrl: null },
    };
  });

  // ── Scenario 1: Successful Profile Update ─────────────────────────────────

  test('user updates display name and bio — profile reflects changes immediately', async () => {
    // Arrange
    const userId = 'user-001';

    // Act
    const result = await updateProfile(userId, { displayName: 'Manco', bio: 'Remax agent' });
    const profile = await getProfile(userId);

    // Assert
    expect(result.success).toBe(true);
    expect(profile.displayName).toBe('Manco');
    expect(profile.bio).toBe('Remax agent');
  });

  test('user uploads a valid JPG profile picture — photo is saved', async () => {
    // Arrange
    const userId = 'user-001';
    const file = { uri: 'file:///photos/avatar.jpg', mimeType: 'image/jpeg', sizeBytes: 1 * 1024 * 1024 };

    // Act
    const result = await updateProfilePhoto(userId, file);
    const profile = await getProfile(userId);

    // Assert
    expect(result.success).toBe(true);
    expect(profile.photoUrl).toBe('file:///photos/avatar.jpg');
  });

  test('user uploads a valid PNG profile picture — photo is saved', async () => {
    // Arrange
    const userId = 'user-001';
    const file = { uri: 'file:///photos/avatar.png', mimeType: 'image/png', sizeBytes: 2 * 1024 * 1024 };

    // Act
    const result = await updateProfilePhoto(userId, file);
    const profile = await getProfile(userId);

    // Assert
    expect(result.success).toBe(true);
    expect(profile.photoUrl).toBe('file:///photos/avatar.png');
  });

  test('user updates name, bio and photo together — all changes are saved', async () => {
    // Arrange
    const userId = 'user-001';
    const file = { uri: 'file:///photos/avatar.jpg', mimeType: 'image/jpeg', sizeBytes: 1 * 1024 * 1024 };

    // Act
    await updateProfile(userId, { displayName: 'Manco', bio: 'Remax agent' });
    await updateProfilePhoto(userId, file);
    const profile = await getProfile(userId);

    // Assert
    expect(profile.displayName).toBe('Manco');
    expect(profile.bio).toBe('Remax agent');
    expect(profile.photoUrl).toBe('file:///photos/avatar.jpg');
  });

  // ── Scenario 2: Invalid Data Entry ────────────────────────────────────────

  test('user uploads a PDF — system rejects it with error message', async () => {
    // Arrange
    const userId = 'user-001';
    const file = { uri: 'file:///docs/cv.pdf', mimeType: 'application/pdf', sizeBytes: 1 * 1024 * 1024 };

    // Act
    const result = await updateProfilePhoto(userId, file);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid file format|jpg or png/i);
  });

  test('user enters name exceeding 30 characters — system rejects with error', async () => {
    // Arrange
    const userId = 'user-001';

    // Act
    const result = await updateProfile(userId, { displayName: 'A'.repeat(31) });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too long|max 30/i);
  });

  test('user submits empty name — system rejects and data is not saved', async () => {
    // Arrange
    const userId = 'user-001';

    // Act
    const result = await updateProfile(userId, { displayName: '' });
    const profile = await getProfile(userId);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/required|cannot be empty/i);
    expect(profile.displayName).toBe('OldName'); // unchanged
  });

  test('invalid update does not overwrite existing profile data', async () => {
    // Arrange
    const userId = 'user-001';

    // Act
    await updateProfile(userId, { displayName: '' }); // invalid
    const profile = await getProfile(userId);

    // Assert
    expect(profile.displayName).toBe('OldName');
    expect(profile.bio).toBe('Old bio');
  });

  test('user uploads file over 5 MB — system rejects with error', async () => {
    // Arrange
    const userId = 'user-001';
    const file = { uri: 'file:///photos/huge.jpg', mimeType: 'image/jpeg', sizeBytes: 6 * 1024 * 1024 };

    // Act
    const result = await updateProfilePhoto(userId, file);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too large|5 mb/i);
  });
});