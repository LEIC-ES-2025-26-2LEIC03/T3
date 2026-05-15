// ─── Update Body Metrics Unit Tests ──────────────────────────────────────────
// US-24 Update weight and body fat percentage to track physical progress

describe('updateBodyMetrics — pure logic', () => {

    // ── Validation helpers (mirrors profileService logic) ─────────────────────

    const HEIGHT_MIN = 50;
    const HEIGHT_MAX = 300;
    const WEIGHT_MIN = 1;
    const WEIGHT_MAX = 500;
    const BODY_FAT_MIN = 1;
    const BODY_FAT_MAX = 100;

    function validateMetrics({ heightCm, weightKg, bodyFatPercentage }) {
        if (
            weightKg == null || isNaN(weightKg) ||
            weightKg < WEIGHT_MIN || weightKg > WEIGHT_MAX
        ) {
            return { valid: false, error: 'Weight is invalid — please enter a realistic value.' };
        }
        if (
            heightCm == null || isNaN(heightCm) ||
            heightCm < HEIGHT_MIN || heightCm > HEIGHT_MAX
        ) {
            return { valid: false, error: 'Height is invalid — please enter a realistic value.' };
        }
        if (
            bodyFatPercentage != null &&
            (isNaN(bodyFatPercentage) || bodyFatPercentage < BODY_FAT_MIN || bodyFatPercentage > BODY_FAT_MAX)
        ) {
            return { valid: false, error: 'Body fat is out of range — body composition is invalid.' };
        }
        return { valid: true };
    }

    function applyMetricsUpdate(history, userId, metrics) {
        const result = validateMetrics(metrics);
        if (!result.valid) return { success: false, error: result.error };

        history.push({
            userId,
            weightKg: metrics.weightKg,
            bodyFatPercentage: metrics.bodyFatPercentage ?? null,
            date: metrics.date ?? new Date().toISOString(),
        });

        return { success: true };
    }

    let history;
    beforeEach(() => {
        history = [];
    });

    // ── Weight validation ──────────────────────────────────────────────────────

    test('saves valid weight and body fat successfully', () => {
        const result = applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: 75, bodyFatPercentage: 15 });
        expect(result.success).toBe(true);
        expect(history).toHaveLength(1);
        expect(history[0].weightKg).toBe(75);
    });

    test('rejects weight of zero', () => {
        const result = applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: 0 });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/weight.*invalid/i);
    });

    test('rejects negative weight', () => {
        const result = applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: -10 });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/weight.*invalid/i);
    });

    test('rejects weight above maximum (500 kg)', () => {
        const result = applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: 501 });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/weight.*invalid/i);
    });

    test('rejects non-numeric weight', () => {
        const result = applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: NaN });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/weight.*invalid/i);
    });

    test('accepts weight at minimum boundary (1 kg)', () => {
        const result = applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: 1 });
        expect(result.success).toBe(true);
    });

    test('accepts weight at maximum boundary (500 kg)', () => {
        const result = applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: 500 });
        expect(result.success).toBe(true);
    });

    // ── Height validation ──────────────────────────────────────────────────────

    test('rejects height below minimum (50 cm)', () => {
        const result = applyMetricsUpdate(history, 'user-001', { heightCm: 49, weightKg: 75 });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/height.*invalid/i);
    });

    test('rejects height above maximum (300 cm)', () => {
        const result = applyMetricsUpdate(history, 'user-001', { heightCm: 301, weightKg: 75 });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/height.*invalid/i);
    });

    test('rejects non-numeric height', () => {
        const result = applyMetricsUpdate(history, 'user-001', { heightCm: NaN, weightKg: 75 });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/height.*invalid/i);
    });

    // ── Body fat validation ────────────────────────────────────────────────────

    test('rejects body fat above 100%', () => {
        const result = applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: 75, bodyFatPercentage: 105 });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/body fat.*invalid|out of range/i);
    });

    test('rejects body fat of zero', () => {
        const result = applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: 75, bodyFatPercentage: 0 });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/body fat.*invalid|out of range/i);
    });

    test('rejects non-numeric body fat', () => {
        const result = applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: 75, bodyFatPercentage: NaN });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/body fat.*invalid|out of range/i);
    });

    test('body fat is optional — null is accepted', () => {
        const result = applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: 75, bodyFatPercentage: null });
        expect(result.success).toBe(true);
        expect(history[0].bodyFatPercentage).toBeNull();
    });

    // ── History ────────────────────────────────────────────────────────────────

    test('appends each save as a new record', () => {
        applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: 72, bodyFatPercentage: 13, date: '2026-01-01T00:00:00Z' });
        applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: 71, bodyFatPercentage: 12, date: '2026-02-01T00:00:00Z' });
        expect(history).toHaveLength(2);
    });

    test('previous records are not overwritten by a new save', () => {
        applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: 72, bodyFatPercentage: 13, date: '2026-01-01T00:00:00Z' });
        applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: 71, bodyFatPercentage: 12, date: '2026-02-01T00:00:00Z' });
        expect(history[0].weightKg).toBe(72);
        expect(history[1].weightKg).toBe(71);
    });

    test('invalid save does not add a record to history', () => {
        applyMetricsUpdate(history, 'user-001', { heightCm: 175, weightKg: 0 }); // invalid
        expect(history).toHaveLength(0);
    });
});