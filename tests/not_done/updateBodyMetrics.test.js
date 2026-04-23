// ─── Update Body Metrics Acceptance Tests ─────────────────────────────────
// US-24 Update weight and body fat percentage to track physical progress

describe('US-24 | Update Body Metrics', () => {
  test('should save a new body metric record successfully', async () => {
    // Arrange
    const userId = 'user-001';
    const metrics = {
      weightKg: 76,
      bodyFatPercentage: 17.5,
      recordedAt: '2026-04-19T10:00:00Z',
    };

    // Act
    const result = await updateBodyMetrics(userId, metrics);
    const history = await getBodyMetricsHistory(userId);

    // Assert
    expect(result.success).toBe(true);
    expect(history[0].weightKg).toBe(76);
    expect(history[0].bodyFatPercentage).toBe(17.5);
  });

  test('should reject invalid metric values', async () => {
    // Arrange
    const userId = 'user-001';
    const metrics = {
      weightKg: 0,
      bodyFatPercentage: 105,
    };

    // Act
    const result = await updateBodyMetrics(userId, metrics);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/weight.*invalid|body fat.*invalid/i);
  });

  test('should preserve historical metric entries in descending order', async () => {
    // Arrange
    const userId = 'user-001';
    await updateBodyMetrics(userId, { weightKg: 78, bodyFatPercentage: 18, recordedAt: '2026-04-18T08:00:00Z' });
    await updateBodyMetrics(userId, { weightKg: 77, bodyFatPercentage: 17, recordedAt: '2026-04-19T08:00:00Z' });

    // Act
    const history = await getBodyMetricsHistory(userId);

    // Assert
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(new Date(history[0].recordedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(history[1].recordedAt).getTime()
    );
  });
});
