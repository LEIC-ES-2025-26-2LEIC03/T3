import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteUser } from 'firebase/auth';
import { deleteAccount } from '../../src/services/authService';
import { auth } from '../../src/utils/firebaseConfig';
import { deleteAllUserData } from '../../src/utils/firestoreDb';

jest.mock('../../src/utils/firestoreDb', () => ({
  deleteAllUserData: jest.fn(),
}));

describe('US-11 | Delete Account unit tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    auth.currentUser = { uid: 'user-001' };
  });

  it('refuses deletion when there is no signed-in user', async () => {
    auth.currentUser = null;

    await expect(deleteAccount()).resolves.toEqual({
      success: false,
      error: 'Not signed in.',
    });
  });

  it('deletes user-owned data before deleting the auth account', async () => {
    const calls = [];
    deleteAllUserData.mockImplementationOnce(async () => calls.push('data'));
    deleteUser.mockImplementationOnce(async () => calls.push('auth'));

    const result = await deleteAccount();

    expect(result).toEqual({ success: true });
    expect(deleteAllUserData).toHaveBeenCalledWith('user-001');
    expect(deleteUser).toHaveBeenCalledWith(auth.currentUser);
    expect(calls).toEqual(['data', 'auth']);
  });

  it('keeps the auth account when data deletion fails', async () => {
    deleteAllUserData.mockRejectedValueOnce({ code: 'auth/network-request-failed' });

    const result = await deleteAccount();

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/network/i);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('asks the user to re-authenticate when Firebase requires a recent login', async () => {
    deleteAllUserData.mockResolvedValueOnce();
    deleteUser.mockRejectedValueOnce({ code: 'auth/requires-recent-login' });

    const result = await deleteAccount();

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/log out and log back in/i);
  });

  it('clears local preferences only after full deletion succeeds', async () => {
    await AsyncStorage.setItem('@stayLoggedIn', 'true');
    deleteAllUserData.mockResolvedValueOnce();
    deleteUser.mockResolvedValueOnce();

    await deleteAccount();

    await expect(AsyncStorage.getItem('@stayLoggedIn')).resolves.toBeNull();
  });
});

