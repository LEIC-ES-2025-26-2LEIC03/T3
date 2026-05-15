import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteUser } from 'firebase/auth';
import { deleteAccount } from '../../src/services/authService';
import { auth } from '../../src/utils/firebaseConfig';
import { deleteAllUserData } from '../../src/utils/firestoreDb';

jest.mock('../../src/utils/firestoreDb', () => ({
  deleteAllUserData: jest.fn(),
}));

describe('US-11 | Delete Account acceptance tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    auth.currentUser = { uid: 'user-001' };
  });

  it('permanently removes user data, deletes the auth user, and clears local preferences', async () => {
    await AsyncStorage.setItem('@stayLoggedIn', 'true');
    deleteAllUserData.mockResolvedValueOnce();
    deleteUser.mockResolvedValueOnce();

    const result = await deleteAccount();

    expect(result.success).toBe(true);
    expect(deleteAllUserData).toHaveBeenCalledWith('user-001');
    expect(deleteUser).toHaveBeenCalledWith(auth.currentUser);
    await expect(AsyncStorage.getItem('@stayLoggedIn')).resolves.toBeNull();
  });

  it('does not delete the auth account if wiping app data fails', async () => {
    deleteAllUserData.mockRejectedValueOnce(new Error('firestore unavailable'));

    const result = await deleteAccount();

    expect(result.success).toBe(false);
    expect(deleteUser).not.toHaveBeenCalled();
  });
});

