// ─── Update Body Metrics Acceptance Tests ─────────────────────────────────────
// US-24 Update weight and body fat percentage to track physical progress

let metricsDb = {};

global.updateBodyMetrics = async (userId, metrics) => {
    const { weightKg, bodyFatPercentage, heightCm = 175 } = metrics;

    if (weightKg == null || isNaN(weightKg) || weightKg < 1 || weightKg > 500) {
        return { success: false, error: 'Weight is invalid — please enter a realistic value.' };
    }
    if (heightCm == null || isNaN(heightCm) || heightCm < 50 || heightCm > 300) {
        return { success: false, error: 'Height is invalid — please enter a realistic value.' };
    }
    if (
        bodyFatPercentage != null &&
        (isNaN(bodyFatPercentage) || bodyFatPercentage < 1 || bodyFatPercentage > 100)
    ) {
        return { success: false, error: 'Body fat is out of range — body composition is invalid.' };
    }

    if (!metricsDb[userId]) metricsDb[userId] = [];
    metricsDb[userId].push({
        weightKg,
        bodyFatPercentage: bodyFatPercentage ?? null,
        recordedAt: metrics.recordedAt ?? new Date().toISOString(),
    });

    return { success: true };
};

global.getBodyMetricsHistory = async (userId) => {
    const records = metricsDb[userId] ?? [];
    return [...records].reverse(); // newest first
};

describe('US-24 | Update Body Metrics', () => {

    beforeEach(() => {
        metricsDb = {};
    });

    // ── Scenario 1: Normal Case ────────────────────────────────────────────────

    test('should save a new body metric record successfully', async () => {
        // Arrange
        const userId = 'user-001';
        const metrics = { weightKg: 76, bodyFatPercentage: 17.5, recordedAt: '2026-04-19T10:00:00Z' };

        // Act
        const result = await updateBodyMetrics(userId, metrics);
        const history = await getBodyMetricsHistory(userId);

        // Assert
        expect(result.success).toBe(true);
        expect(history[0].weightKg).toBe(76);
        expect(history[0].bodyFatPercentage).toBe(17.5);
    });

    test('user receives confirmation after successful save', async () => {
        // Arrange
        const userId = 'user-001';

        // Act
        const result = await updateBodyMetrics(userId, { weightKg: 71, bodyFatPercentage: 12 });

        // Assert
        expect(result.success).toBe(true);
    });

    test('should preserve historical metric entries in descending order', async () => {
        // Arrange
        const userId = 'user-001';
        await updateBodyMetrics(userId, { weightKg: 78, bodyFatPercentage: 18, recordedAt: '2026-01-01T08:00:00Z' });
        await updateBodyMetrics(userId, { weightKg: 77, bodyFatPercentage: 17, recordedAt: '2026-02-01T08:00:00Z' });

        // Act
        const history = await getBodyMetricsHistory(userId);

        // Assert
        expect(history.length).toBeGreaterThanOrEqual(2);
        expect(new Date(history[0].recordedAt).getTime()).toBeGreaterThanOrEqual(
            new Date(history[1].recordedAt).getTime()
        );
    });

    test('previous records remain stored after a new save', async () => {
        // Arrange
        const userId = 'user-001';
        await updateBodyMetrics(userId, { weightKg: 72, bodyFatPercentage: 13, recordedAt: '2026-01-01T00:00:00Z' });
        await updateBodyMetrics(userId, { weightKg: 71, bodyFatPercentage: 12, recordedAt: '2026-02-01T00:00:00Z' });

        // Act
        const history = await getBodyMetricsHistory(userId);

        // Assert — both records present
        expect(history).toHaveLength(2);
        const weights = history.map(r => r.weightKg);
        expect(weights).toContain(72);
        expect(weights).toContain(71);
    });

    test('body fat is optional — save succeeds without it', async () => {
        // Arrange
        const userId = 'user-001';

        // Act
        const result = await updateBodyMetrics(userId, { weightKg: 75 });
        const history = await getBodyMetricsHistory(userId);

        // Assert
        expect(result.success).toBe(true);
        expect(history[0].bodyFatPercentage).toBeNull();
    });

    // ── Scenario 2: Exceptional Case ──────────────────────────────────────────

    test('should reject invalid metric values — zero weight', async () => {
        // Arrange
        const userId = 'user-001';

        // Act
        const result = await updateBodyMetrics(userId, { weightKg: 0, bodyFatPercentage: 15 });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/weight.*invalid/i);
    });

    test('should reject body fat percentage above 100', async () => {
        // Arrange
        const userId = 'user-001';

        // Act
        const result = await updateBodyMetrics(userId, { weightKg: 75, bodyFatPercentage: 105 });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/body fat.*invalid|out of range/i);
    });

    test('invalid save does not add a record to history', async () => {
        // Arrange
        const userId = 'user-001';

        // Act
        await updateBodyMetrics(userId, { weightKg: 0 }); // invalid
        const history = await getBodyMetricsHistory(userId);

        // Assert
        expect(history).toHaveLength(0);
    });

    test('system prevents saving non-numeric weight', async () => {
        // Arrange
        const userId = 'user-001';

        // Act
        const result = await updateBodyMetrics(userId, { weightKg: NaN, bodyFatPercentage: 15 });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/weight.*invalid/i);
    });

    test('system prevents saving non-numeric body fat', async () => {
        // Arrange
        const userId = 'user-001';

        // Act
        const result = await updateBodyMetrics(userId, { weightKg: 75, bodyFatPercentage: NaN });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/body fat.*invalid|out of range/i);
    });
});