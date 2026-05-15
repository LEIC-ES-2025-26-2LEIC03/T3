import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { register, login, setStayLoggedIn, getStayLoggedIn } from '../../src/services/authService';

jest.mock('../../src/utils/firestoreDb', () => ({
  deleteAllUserData: jest.fn(),
}));

describe('US-01/02 | Authentication acceptance tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows a new user to create an account and stay signed in', async () => {
    createUserWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: 'new-user', email: 'new@example.com' },
    });

    const result = await register('new@example.com', 'SecurePass123');

    expect(result.success).toBe(true);
    expect(result.user.email).toBe('new@example.com');
    await expect(getStayLoggedIn()).resolves.toBe(true);
  });

  it('allows an existing user to opt out of staying logged in before signing in', async () => {
    signInWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: 'returning-user', email: 'user@example.com' },
    });

    await setStayLoggedIn(false);
    const result = await login('user@example.com', 'SecurePass123');

    expect(result.success).toBe(true);
    await expect(getStayLoggedIn()).resolves.toBe(false);
  });

  it('shows user-safe errors for invalid login attempts', async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/wrong-password' });

    const result = await login('user@example.com', 'wrong');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email or password.');
  });
});

