// ─── Profile Customisation Unit Tests ────────────────────────────────────────
// US-52 Edit profile details and upload a profile picture

describe('profileCustomisation — pure logic', () => {

    // ── Validation helpers (mirrors EditProfileScreen logic) ──────────────────

    function validateDisplayName(name) {
        if (!name || name.trim() === '') {
            return { valid: false, error: 'Name is required and cannot be empty.' };
        }
        if (name.trim().length > 30) {
            return { valid: false, error: 'Name too long — max 30 characters.' };
        }
        return { valid: true };
    }

    function validatePhotoUri(uri) {
        if (!uri) return { valid: true }; // photo is optional
        const lower = uri.toLowerCase();
        const isValidType =
            lower.endsWith('.jpg') ||
            lower.endsWith('.jpeg') ||
            lower.endsWith('.png') ||
            lower.endsWith('.webp') ||
            lower.endsWith('.gif');
        if (!isValidType) {
            return { valid: false, error: 'Invalid file format. Please upload a JPG or PNG.' };
        }
        return { valid: true };
    }

    function validateFileSize(sizeBytes) {
        const MAX = 5 * 1024 * 1024; // 5 MB
        if (sizeBytes > MAX) {
            return { valid: false, error: 'File too large — max 5 MB allowed.' };
        }
        return { valid: true };
    }

    function applyProfileUpdate(profile, updates) {
        const nameResult = validateDisplayName(updates.displayName);
        if (!nameResult.valid) return { success: false, error: nameResult.error };

        if (updates.photoUri) {
            const photoResult = validatePhotoUri(updates.photoUri);
            if (!photoResult.valid) return { success: false, error: photoResult.error };
        }

        return {
            success: true,
            profile: {
                ...profile,
                displayName: updates.displayName.trim(),
                bio: updates.bio?.trim() ?? profile.bio,
                photoUrl: updates.photoUri ?? profile.photoUrl,
            },
        };
    }

    let profile;
    beforeEach(() => {
        profile = {
            displayName: 'OldName',
            bio: 'Old bio',
            photoUrl: null,
        };
    });

    // ── Display Name ───────────────────────────────────────────────────────────

    test('updates display name successfully', () => {
        const result = applyProfileUpdate(profile, { displayName: 'Manco' });
        expect(result.success).toBe(true);
        expect(result.profile.displayName).toBe('Manco');
    });

    test('trims whitespace from display name', () => {
        const result = applyProfileUpdate(profile, { displayName: '  Manco  ' });
        expect(result.success).toBe(true);
        expect(result.profile.displayName).toBe('Manco');
    });

    test('rejects empty display name', () => {
        const result = applyProfileUpdate(profile, { displayName: '' });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/required|cannot be empty/i);
    });

    test('rejects whitespace-only display name', () => {
        const result = applyProfileUpdate(profile, { displayName: '   ' });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/required|cannot be empty/i);
    });

    test('rejects display name longer than 30 characters', () => {
        const result = applyProfileUpdate(profile, { displayName: 'A'.repeat(31) });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/too long|max 30/i);
    });

    test('accepts display name of exactly 30 characters', () => {
        const result = applyProfileUpdate(profile, { displayName: 'A'.repeat(30) });
        expect(result.success).toBe(true);
    });

    // ── Bio ────────────────────────────────────────────────────────────────────

    test('updates bio successfully', () => {
        const result = applyProfileUpdate(profile, { displayName: 'Manco', bio: 'Remax agent' });
        expect(result.success).toBe(true);
        expect(result.profile.bio).toBe('Remax agent');
    });

    test('preserves existing bio when not provided', () => {
        const result = applyProfileUpdate(profile, { displayName: 'Manco' });
        expect(result.success).toBe(true);
        expect(result.profile.bio).toBe('Old bio');
    });

    test('trims whitespace from bio', () => {
        const result = applyProfileUpdate(profile, { displayName: 'Manco', bio: '  Remax agent  ' });
        expect(result.success).toBe(true);
        expect(result.profile.bio).toBe('Remax agent');
    });

    // ── Photo validation ───────────────────────────────────────────────────────

    test('accepts a JPG photo uri', () => {
        const result = validatePhotoUri('file:///path/to/photo.jpg');
        expect(result.valid).toBe(true);
    });

    test('accepts a JPEG photo uri', () => {
        const result = validatePhotoUri('file:///path/to/photo.jpeg');
        expect(result.valid).toBe(true);
    });

    test('accepts a PNG photo uri', () => {
        const result = validatePhotoUri('file:///path/to/photo.png');
        expect(result.valid).toBe(true);
    });

    test('rejects a PDF file', () => {
        const result = validatePhotoUri('file:///path/to/document.pdf');
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/invalid file format|jpg or png/i);
    });

    test('rejects a non-image file', () => {
        const result = validatePhotoUri('file:///path/to/file.txt');
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/invalid file format|jpg or png/i);
    });

    test('photo is optional — no uri passes validation', () => {
        const result = validatePhotoUri(null);
        expect(result.valid).toBe(true);
    });

    // ── File size validation ───────────────────────────────────────────────────

    test('accepts file under 5 MB', () => {
        const result = validateFileSize(2 * 1024 * 1024); // 2 MB
        expect(result.valid).toBe(true);
    });

    test('rejects file over 5 MB', () => {
        const result = validateFileSize(6 * 1024 * 1024); // 6 MB
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/too large|5 mb/i);
    });

    test('accepts file of exactly 5 MB', () => {
        const result = validateFileSize(5 * 1024 * 1024);
        expect(result.valid).toBe(true);
    });

    // ── Combined update ────────────────────────────────────────────────────────

    test('updates name, bio and photo together', () => {
        const result = applyProfileUpdate(profile, {
            displayName: 'Manco',
            bio: 'Remax agent',
            photoUri: 'file:///photo.jpg',
        });
        expect(result.success).toBe(true);
        expect(result.profile.displayName).toBe('Manco');
        expect(result.profile.bio).toBe('Remax agent');
        expect(result.profile.photoUrl).toBe('file:///photo.jpg');
    });

    test('rejects update if name is invalid even when photo is valid', () => {
        const result = applyProfileUpdate(profile, {
            displayName: '',
            photoUri: 'file:///photo.jpg',
        });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/required|cannot be empty/i);
    });
});