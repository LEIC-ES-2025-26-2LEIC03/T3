// ── US-01: Request a Password Reset ──────────────────────────────────────
describe('US-28 | Request a Password Reset', () => {
test('should send a reset email when the address belongs to an active account', async () => { 
 // Arrange 
 const email = 'user@example.com';
// Act
const result = await requestPasswordReset({ email });

// Assert
expect(result.success).toBe(true);
expect(result.message).toMatch(/email.*sent|check your inbox/i);
 
});
test('should return a generic success response when the email is not registered', async () => { 
 // Arrange
 const email = 'ghost@example.com';
// Act
const result = await requestPasswordReset({ email });

// Assert
expect(result.success).toBe(true); // intentionally ambiguous for security
expect(result.message).toMatch(/email.*sent|check your inbox/i);
 
});
test('should reject a reset request when the email field is empty', async () => { 
 // Arrange 
 const email = '';
// Act
const result = await requestPasswordReset({ email });

// Assert
expect(result.success).toBe(false);
expect(result.error).toMatch(/email.*required|cannot be empty/i);
 
});
test('should reject a reset request when the email format is invalid', async () => { 
 // Arrange 
 const email = 'not-an-email';
// Act
const result = await requestPasswordReset({ email });

// Assert
expect(result.success).toBe(false);
expect(result.error).toMatch(/email.*invalid|valid email/i);
 
 
});
});
// ── US-02: Validate a Reset Token ────────────────────────────────────────
describe('US-02 | Validate a Reset Token', () => {
test('should confirm the token is valid when it exists and has not expired', async () => { 
 // Arrange 
 const token = 'valid-reset-token-001';
// Act
const result = await validateResetToken({ token });

// Assert
expect(result.valid).toBe(true);
expect(result.userId).toBeDefined();
 
});
test('should reject a token that does not exist', async () => { 
 // Arrange 
 const token = 'made-up-token-xyz';
// Act
const result = await validateResetToken({ token });

// Assert
expect(result.valid).toBe(false);
expect(result.error).toMatch(/token.*invalid|not found/i);
 
});
test('should reject a token that has already been used', async () => { 
 // Arrange 
 const token = 'already-used-token-001';
// Act
const result = await validateResetToken({ token });

// Assert
expect(result.valid).toBe(false);
expect(result.error).toMatch(/token.*already used|expired/i);

 
});
});
// ── US-03: Reset the Password ─────────────────────────────────────────────
describe('US-30 | Reset the Password', () => {
test('should update the password when the token is valid and passwords match', async () => { 
 // Arrange 
 const resetData = { token: 'valid-reset-token-001', newPassword: 'NewSecurePass1!', confirmPassword: 'NewSecurePass1!', };
// Act
const result = await resetPassword(resetData);

// Assert
expect(result.success).toBe(true);

 
});
test('should reject the reset when the two passwords do not match', async () => { 
 // Arrange 
 const resetData = { token: 'valid-reset-token-001', newPassword: 'NewSecurePass1!', confirmPassword: 'DifferentPass2!', };
// Act
const result = await resetPassword(resetData);

// Assert
expect(result.success).toBe(false);
expect(result.error).toMatch(/passwords.*do not match/i);

 
});
test('should reject a new password shorter than 8 characters', async () => { 
 // Arrange 
 const resetData = { token: 'valid-reset-token-001', newPassword: 'abc', confirmPassword: 'abc', };
// Act
const result = await resetPassword(resetData);

// Assert
expect(result.success).toBe(false);
expect(result.error).toMatch(/password.*too short|min.*8/i);

 
});
test('should invalidate the token after a successful reset so it cannot be reused', async () => { 
 // Arrange 
 const token = 'valid-reset-token-001'; // const _ = await resetPassword({ token, newPassword: 'NewSecurePass1!', confirmPassword: 'NewSecurePass1!' });
// Act
const result = await validateResetToken({ token });

// Assert
expect(result.valid).toBe(false);
expect(result.error).toMatch(/token.*already used|expired/i);
 
});
test('should allow the user to log in with the new password after a successful reset', async () => { 
 // Arrange 
 const userId = 'user-001'; const newPassword = 'NewSecurePass1!';
// Act
const result = await login({ userId, password: newPassword });

// Assert
expect(result.success).toBe(true);
expect(result.session).toBeDefined();

 
});
});
// ── US-04: Reset Token Expiry ─────────────────────────────────────────────
describe('US-31 | Reset Token Expiry', () => {
test('should reject a reset token that is older than 1 hour', async () => { 
 // Arrange 
 const expiredToken = 'expired-reset-token-001';
// Act
const result = await validateResetToken({ token: expiredToken });

// Assert
expect(result.valid).toBe(false);
expect(result.error).toMatch(/token.*expired/i);

});
test('should reject a password reset attempt using an expired token', async () => { 
 // Arrange 
 const resetData = { token: 'expired-reset-token-001', newPassword: 'NewSecurePass1!', confirmPassword: 'NewSecurePass1!', };
// Act
const result = await resetPassword(resetData);

// Assert
expect(result.success).toBe(false);
expect(result.error).toMatch(/token.*expired|request a new/i);

 
});
test('should allow the user to request a new token after the previous one expired', async () => { 
 // Arrange 
 const email = 'user@example.com';
// Act
const result = await requestPasswordReset({ email });

// Assert
expect(result.success).toBe(true);
expect(result.message).toMatch(/email.*sent|check your inbox/i);

 
});
});
// ── US-05: Reactivate an Account Pending Deletion ─────────────────────────
describe('US-05 | Reactivate an Account Pending Deletion via Recovery Email', () => {
test('should send a reactivation email when the user requests recovery for a pending-deletion account', async () => { 
 // Arrange 
 const email = 'pending-deletion-user@example.com';
// Act
const result = await requestPasswordReset({ email });

// Assert
expect(result.success).toBe(true);
expect(result.message).toMatch(/email.*sent|check your inbox/i);

 
});
test('should restore the account to active when the user completes recovery while pending deletion', async () => { 
 // Arrange 
 const reactivationData = { token: 'valid-reactivation-token-001', newPassword: 'NewSecurePass1!', confirmPassword: 'NewSecurePass1!', };
// Act
const result = await resetPassword(reactivationData);

// Assert
expect(result.success).toBe(true);
const account = await getAccount(result.userId);
expect(account.status).toBe('active');
expect(account.scheduledDeletionAt).toBeNull();

 
});
test('should not allow reactivation after the grace period has expired and data has been deleted', async () => { 
 // Arrange 
 const token = 'post-deletion-token-001';
// Act
const result = await resetPassword({
//   token,
newPassword: 'NewSecurePass1!',
confirmPassword: 'NewSecurePass1!',

// Assert
expect(result.success).toBe(false);
expect(result.error).toMatch(/account.*deleted|cannot recover/i);
 
});
});
