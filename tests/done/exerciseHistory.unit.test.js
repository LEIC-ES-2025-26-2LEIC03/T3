import { computeRecords, computeChartData } from '../../src/screens/ExerciseScreen';

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

describe('Graphics Tab | Chart Data computation', () => {
  it('correctly processes and formats history data for line charts', () => {
    const history = [
      {
        date: '2026-05-18T10:00:00.000Z',
        sets: [
          { weight: 100, reps: 5 },
          { weight: 90, reps: 8 },
        ]
      },
      {
        date: '2026-05-15T10:00:00.000Z',
        sets: [
          { weight: 80, reps: 10 },
          { weight: 85, reps: 10 }
        ]
      }
    ];

    const chartData = computeChartData(history);
    
    // Sort ascending, so oldest (15th) is first, newest (18th) is second
    expect(chartData.labels).toEqual(['15/5', '18/5']);
    
    // Data maxes
    expect(chartData.maxWeightData).toEqual([85, 100]); // best weight for each session
    expect(chartData.totalVolumeData).toEqual([1650, 1220]); // 80*10 + 85*10 = 1650; 100*5 + 90*8 = 1220
    expect(chartData.maxRepsData).toEqual([10, 8]); // max reps for each session
    
    // 1RM est
    // For 85x10: 85 * (36 / 27) = 113.3
    // For 100x5: 100 * (36 / 32) = 112.5
    expect(chartData.est1RMData).toEqual([113.3, 112.5]);
  });

  it('handles empty history by returning default arrays containing at least one zero/empty value', () => {
    const chartData = computeChartData([]);
    
    expect(chartData.labels).toEqual(['']);
    expect(chartData.est1RMData).toEqual([0]);
    expect(chartData.maxWeightData).toEqual([0]);
    expect(chartData.totalVolumeData).toEqual([0]);
    expect(chartData.maxRepsData).toEqual([0]);
  });
});

