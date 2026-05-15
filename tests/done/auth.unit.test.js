import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  getStayLoggedIn,
  setStayLoggedIn,
  register,
  login,
  logout,
} from '../../src/services/authService';
import { auth } from '../../src/utils/firebaseConfig';

jest.mock('../../src/utils/firestoreDb', () => ({
  deleteAllUserData: jest.fn(),
}));

describe('US-01/02/03 | Authentication unit tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('defaults stay-logged-in preference to true for new users', async () => {
    await expect(getStayLoggedIn()).resolves.toBe(true);
  });

  it('persists and reads the stay-logged-in preference', async () => {
    await setStayLoggedIn(false);
    await expect(getStayLoggedIn()).resolves.toBe(false);

    await setStayLoggedIn(true);
    await expect(getStayLoggedIn()).resolves.toBe(true);
  });

  it('registers a new user and keeps them logged in by default', async () => {
    createUserWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: 'u1', email: 'new@example.com' },
    });

    const result = await register('new@example.com', 'StrongPass123');

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      'new@example.com',
      'StrongPass123'
    );
    expect(result).toEqual({
      success: true,
      user: { uid: 'u1', email: 'new@example.com' },
    });
    await expect(getStayLoggedIn()).resolves.toBe(true);
  });

  it('returns a friendly registration error for duplicate email', async () => {
    createUserWithEmailAndPassword.mockRejectedValueOnce({
      code: 'auth/email-already-in-use',
    });

    const result = await register('taken@example.com', 'StrongPass123');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already exists/i);
  });

  it('logs in existing users and maps bad credentials to a friendly error', async () => {
    signInWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: 'u1', email: 'user@example.com' },
    });

    await expect(login('user@example.com', 'correct')).resolves.toMatchObject({
      success: true,
      user: { uid: 'u1' },
    });

    signInWithEmailAndPassword.mockRejectedValueOnce({
      code: 'auth/invalid-credential',
    });

    await expect(login('user@example.com', 'wrong')).resolves.toEqual({
      success: false,
      error: 'Invalid email or password.',
    });
  });

  it('delegates logout to Firebase Auth', async () => {
    signOut.mockResolvedValueOnce();

    await logout();

    expect(signOut).toHaveBeenCalledWith(auth);
  });
});

