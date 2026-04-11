// ── US-01: Create an Account ──────────────────────────────────────────────

describe('US-01 | Create an Account', () => {

  test('should create an account successfully with valid credentials', async () => {
    // Arrange
    const newUser = {
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'SecurePass123',
    };

    // Act
    const result = await registerUser(newUser);

    // Assert
    expect(result.success).toBe(true);
    expect(result.user.email).toBe(newUser.email);
  });

  test('should reject registration when email is already in use', async () => {
    // Arrange
    const duplicateUser = {
      fullName: 'Jane Doe',
      email: 'already@used.com', // assume this email exists in the system
      password: 'SecurePass123',
    };

    // Act
    const result = await registerUser(duplicateUser);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/email.*already/i);

  });

  test('should reject registration when password is too short', async () => {
    // Arrange
    const weakPasswordUser = {
      fullName: 'John Doe',
      email: 'john2@example.com',
      password: '123', // too short
    };

    // Act
    const result = await registerUser(weakPasswordUser);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/password/i);

  });

});

// ── US-02: Log In ─────────────────────────────────────────────────────────

describe('US-02 | Log Into Account', () => {

  test('should log in successfully with valid credentials', async () => {
    // Arrange
    const credentials = {
      email: 'john@example.com',
      password: 'SecurePass123',
    };

    // Act
    const result = await loginUser(credentials);

    // Assert
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
  });

  test('should reject login with wrong password', async () => {
    // Arrange
    const badCredentials = {
      email: 'john@example.com',
      password: 'WrongPassword',
    };

    // Act
    const result = await loginUser(badCredentials);

    // Assert
    expect(result.success).toBe(false);
    expect(result.token).toBeUndefined();
  });

});

// ── US-03: Log Out ────────────────────────────────────────────────────────

describe('US-03 | Log Out of Account', () => {

  test('should clear session token on logout', async () => {
    // Arrange — assume user is logged in and a token is stored
    await loginUser({ email: 'john@example.com', password: 'SecurePass123' });

    // Act
    await logoutUser();

    // Assert
    const token = await getStoredToken();
    expect(token).toBeNull();
  });

});

// ── US-11: Delete Account ─────────────────────────────────────────────────

describe('US-11 | Delete Account', () => {

  test('should permanently delete the account and all associated data', async () => {
    // Arrange
    const userId = 'test-user-123';

    // Act
    const result = await deleteAccount(userId, confirmationText: 'DELETE');

    // Assert
    expect(result.success).toBe(true);
    const user = await findUserById(userId);
    expect(user).toBeNull();
  });

  test('should reject account deletion if confirmation text is wrong', async () => {
    // Arrange
    const userId = 'test-user-123';

    // Act
    const result = await deleteAccount(userId, confirmationText: 'delete'); // wrong case

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/confirmation/i);
  });

});
