// ─── User Profile Input Acceptance Tests ─────────────────────────────────
// US-20 Enter profile details for personalized recommendations

describe('US-20 | Enter User Profile Details', () => {
  test('should save height, weight, body composition, and fitness goals', async () => {
    // Arrange
    const userId = 'user-001';
    const profileData = {
      heightCm: 180,
      weightKg: 78,
      bodyFatPercentage: 18,
      fitnessGoals: 'Build strength and improve muscle definition',
    };

    // Act
    const result = await saveUserProfile(userId, profileData);

    // Assert
    expect(result.success).toBe(true);
    expect(result.profile.heightCm).toBe(180);
    expect(result.profile.weightKg).toBe(78);
    expect(result.profile.bodyFatPercentage).toBe(18);
    expect(result.profile.fitnessGoals).toContain('strength');
  });

  test('should reject invalid height or weight values', async () => {
    // Arrange
    const userId = 'user-001';
    const profileData = {
      heightCm: 20,
      weightKg: -5,
      bodyFatPercentage: 15,
      fitnessGoals: 'Lose fat',
    };

    // Act
    const result = await saveUserProfile(userId, profileData);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/height.*invalid|weight.*invalid/i);
  });

  test('should reject body composition values outside a realistic range', async () => {
    // Arrange
    const userId = 'user-001';
    const profileData = {
      heightCm: 175,
      weightKg: 70,
      bodyFatPercentage: 150,
      fitnessGoals: 'Improve conditioning',
    };

    // Act
    const result = await saveUserProfile(userId, profileData);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/body fat.*range|body composition.*invalid/i);
  });

  test('should persist the profile data and retrieve it later', async () => {
    // Arrange
    const userId = 'user-001';
    const profileData = {
      heightCm: 172,
      weightKg: 72,
      bodyFatPercentage: 16,
      fitnessGoals: 'Increase endurance',
    };

    // Act
    await saveUserProfile(userId, profileData);
    const profile = await getUserProfile(userId);

    // Assert
    expect(profile).toBeDefined();
    expect(profile.heightCm).toBe(172);
    expect(profile.weightKg).toBe(72);
    expect(profile.bodyFatPercentage).toBe(16);
    expect(profile.fitnessGoals).toBe('Increase endurance');
  });
});
