import { createTemplate, fetchTemplates, updateTemplate, deleteTemplate } from '../../src/utils/firestoreDb';
import {
  createTemplate as createLocalTemplate,
  fetchTemplates as fetchLocalTemplates,
  updateTemplate as updateLocalTemplate,
  deleteTemplate as deleteLocalTemplate,
} from '../../src/utils/db';
import { syncPendingWorkouts } from '../../src/services/syncService';

jest.mock('../../src/utils/db', () => ({
  fetchTemplates: jest.fn(() => Promise.resolve([])),
  fetchTemplateById: jest.fn(() => Promise.resolve(null)),
  templateNameExists: jest.fn(() => Promise.resolve(false)),
  createTemplate: jest.fn(() => Promise.resolve()),
  updateTemplate: jest.fn(() => Promise.resolve()),
  deleteTemplate: jest.fn(() => Promise.resolve()),
  saveWorkout: jest.fn(() => Promise.resolve()),
  fetchWorkouts: jest.fn(() => Promise.resolve([])),
  deleteWorkout: jest.fn(() => Promise.resolve()),
  applyServerTemplates: jest.fn(() => Promise.resolve()),
  applyServerWorkouts: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/services/syncService', () => ({
  syncPendingWorkouts: jest.fn(() => Promise.resolve()),
}));

const template = {
  id: 'template-1',
  name: 'Offline Push',
  tag: 'Push',
  exerciseIds: ['bench-press'],
};

describe('offline template behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves a template locally and queues sync', async () => {
    await createTemplate('user-001', template.id, template.name, template.tag, template.exerciseIds);

    expect(createLocalTemplate).toHaveBeenCalledWith(
      'user-001',
      template.id,
      template.name,
      template.tag,
      template.exerciseIds
    );
    expect(syncPendingWorkouts).toHaveBeenCalledWith('user-001');
  });

  it('returns locally persisted templates without requiring remote fetch', async () => {
    const cachedTemplate = {
      id: template.id,
      user_id: 'user-001',
      name: template.name,
      tag: template.tag,
      sync_status: 'pending',
      exercises: [],
      exerciseIds: template.exerciseIds,
    };
    fetchLocalTemplates.mockResolvedValueOnce([cachedTemplate]);

    const result = await fetchTemplates('user-001');

    expect(result).toEqual([cachedTemplate]);
    expect(syncPendingWorkouts).toHaveBeenCalledWith('user-001');
  });

  it('updates and deletes templates locally', async () => {
    await updateTemplate('user-001', template.id, 'Offline Pull', 'Pull', ['lat-pulldown']);
    await deleteTemplate('user-001', template.id);

    expect(updateLocalTemplate).toHaveBeenCalledWith(
      'user-001',
      template.id,
      'Offline Pull',
      'Pull',
      ['lat-pulldown']
    );
    expect(deleteLocalTemplate).toHaveBeenCalledWith('user-001', template.id);
  });
});
