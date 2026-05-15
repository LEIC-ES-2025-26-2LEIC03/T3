function computeRecords(history) {
  let bestWeight = 0;
  let bestVolume = 0;
  let bestSetStr = null;
  let totalSets = 0;
  let est1RM = 0;

  for (const entry of history) {
    for (const s of entry.sets) {
      const w = s.weight ?? 0;
      const r = s.reps ?? 0;
      totalSets++;

      if (w > bestWeight) bestWeight = w;

      const vol = w * r;
      if (vol > bestVolume) {
        bestVolume = vol;
        bestSetStr = `${w} kg × ${r}`;
      }

      if (r > 0 && r <= 30 && w > 0) {
        const e1rm = w * (36 / (37 - r));
        if (e1rm > est1RM) est1RM = e1rm;
      }
    }
  }

  return {
    bestWeight,
    bestVolume,
    bestSetStr,
    est1RM: Math.round(est1RM * 10) / 10,
    totalSets,
    totalSessions: history.length,
  };
}

describe('US-02 | Exercise progress unit tests', () => {
  it('computes personal records from workout history', () => {
    const records = computeRecords([
      { sets: [{ weight: 100, reps: 5 }, { weight: 90, reps: 8 }] },
      { sets: [{ weight: 80, reps: 10 }] },
    ]);

    expect(records.bestWeight).toBe(100);
    expect(records.bestVolume).toBe(800);
    expect(records.bestSetStr).toBe('80 kg × 10');
    expect(records.est1RM).toBe(112.5);
    expect(records.totalSets).toBe(3);
    expect(records.totalSessions).toBe(2);
  });

  it('ignores impossible 1RM estimates while still counting sets', () => {
    const records = computeRecords([
      { sets: [{ weight: 100, reps: 31 }, { weight: 0, reps: 10 }] },
    ]);

    expect(records.est1RM).toBe(0);
    expect(records.totalSets).toBe(2);
  });

  it('returns empty record defaults when no history exists', () => {
    expect(computeRecords([])).toEqual({
      bestWeight: 0,
      bestVolume: 0,
      bestSetStr: null,
      est1RM: 0,
      totalSets: 0,
      totalSessions: 0,
    });
  });
});

