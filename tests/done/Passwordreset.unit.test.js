import { resetPassword } from '../../src/services/authService';
import { sendPasswordResetEmail } from 'firebase/auth';

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  deleteUser: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('../../src/utils/firebaseConfig', () => ({
  auth: {},
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('../../src/utils/firestoreDb', () => ({
  deleteAllUserData: jest.fn(),
}));

describe('US-PW | Password Reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns success:true when Firebase sends the reset email', async () => {
    sendPasswordResetEmail.mockResolvedValueOnce(undefined);

    const result = await resetPassword('user@example.com');

    expect(result).toEqual({ success: true });
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({}, 'user@example.com');
  });

  it('returns success:false with a friendly message for an invalid email format', async () => {
    sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/invalid-email' });

    const result = await resetPassword('not-an-email');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Please enter a valid email address.');
  });

  it('returns success:true for an unregistered email to prevent account enumeration', async () => {
    // Firebase resolves without error for unknown addresses — this is
    // intentional security behaviour so attackers cannot probe which
    // emails are registered.
    sendPasswordResetEmail.mockResolvedValueOnce(undefined);

    const result = await resetPassword('ghost@example.com');

    expect(result).toEqual({ success: true });
  });

  it('returns success:false with a friendly message on network error', async () => {
    sendPasswordResetEmail.mockRejectedValueOnce({
      code: 'auth/network-request-failed',
    });

    const result = await resetPassword('user@example.com');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error. Check your connection and try again.');
  });

  it('returns success:false with a friendly message when too many requests are made', async () => {
    sendPasswordResetEmail.mockRejectedValueOnce({
      code: 'auth/too-many-requests',
    });

    const result = await resetPassword('user@example.com');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Too many attempts. Please try again later.');
  });
});