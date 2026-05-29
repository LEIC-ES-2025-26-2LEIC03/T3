import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addBodyMetric,
  createCustomExercise,
  fetchBodyMetrics,
  fetchCustomExercises,
  fetchFavourites,
  getProfile,
  toggleFavourite,
  upsertProfile,
} from '../../src/utils/firestoreDb';

describe('Full offline app acceptance behavior', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('keeps profile, favourites, custom exercises, and body metrics usable offline', async () => {
    await upsertProfile('user-offline', {
      units: 'kg',
      heightCm: 180,
      weightKg: 82,
      displayName: 'Offline Lifter',
    });

    await toggleFavourite('user-offline', {
      id: 'bench-press',
      name: 'Bench press',
      muscle: 'Chest',
      category: 'Chest',
    });

    await createCustomExercise(
      'user-offline',
      'custom-row',
      'Backpack row',
      'Back',
      ['Step 1', 'Step 2'],
      ['Tip 1']
    );

    await addBodyMetric('user-offline', {
      id: 'metric-1',
      weightKg: 82,
      bodyFatPercentage: 18,
      recordedAt: '2026-05-22T10:00:00.000Z',
    });

    await expect(getProfile('user-offline')).resolves.toMatchObject({
      user_id: 'user-offline',
      displayName: 'Offline Lifter',
      height_cm: 180,
      weight_kg: 82,
    });
    await expect(fetchFavourites('user-offline')).resolves.toEqual(new Set(['bench-press']));
    await expect(fetchCustomExercises('user-offline')).resolves.toEqual([
      expect.objectContaining({
        id: 'custom-row',
        name: 'Backpack row',
        steps: ['Step 1', 'Step 2'],
        tips: ['Tip 1'],
      }),
    ]);
    await expect(fetchBodyMetrics('user-offline')).resolves.toEqual([
      expect.objectContaining({ id: 'metric-1', weightKg: 82 }),
    ]);
  });
});
