// ── US-01: Request Account Deletion ──────────────────────────────────────
describe('US-23 | Request Account Deletion', () => {
test('should mark the account as pending deletion when the user requests it', async () => { 
 // Arrange 
 const userId = 'user-001';
// Act
const result = await requestAccountDeletion(userId);

// Assert
expect(result.success).toBe(true);
expect(result.account.status).toBe('pending_deletion');
 
});
test('should return an error when requesting deletion on an already deleted account', async () => { 
// Arrange 
 const deletedUserId = 'user-already-deleted';
// Act
const result = await requestAccountDeletion(deletedUserId);

// Assert
expect(result.success).toBe(false);
expect(result.error).toMatch(/account.*not found|already deleted/i);

 
});
test('should return an error when requesting deletion on an account that is already pending deletion', async () => { 
// Arrange
const pendingUserId = 'user-pending-deletion';
// Act
const result = await requestAccountDeletion(pendingUserId);

// Assert
expect(result.success).toBe(false);
expect(result.error).toMatch(/already pending|deletion.*requested/i); 
});
});

// ── US-02: Confirm Deletion via Password ─────────────────────────────────
describe('US-24 | Confirm Deletion via Password', () => {
test('should proceed with deletion when the user confirms with the correct password', async () => { 
 // Arrange 
 const userId = 'user-001'; const password = 'correct-password';
// Act
const result = await confirmDeletion(userId, { password });

// Assert
expect(result.success).toBe(true);
expect(result.account.status).toBe('deleted');
 
});
test('should reject confirmation when the password is incorrect', async () => { 
 // Arrange 
 const userId = 'user-001'; const password = 'wrong-password';
// Act
const result = await confirmDeletion(userId, { password });

// Assert
expect(result.success).toBe(false);
 expect(result.error).toMatch(/password.*incorrect|invalid credentials/i);

 
});
test('should reject confirmation when the password field is empty', async () => { 
 // Arrange 
 const userId = 'user-001'; const password = '';
// Act
const result = await confirmDeletion(userId, { password });

// Assert
expect(result.success).toBe(false);
expect(result.error).toMatch(/password.*required|cannot be empty/i);
 
});
});
// ── US-03: Grace Period Before Permanent Deletion ─────────────────────────
describe('US-25 | Grace Period Before Permanent Deletion', () => {
test('should set a deletion scheduled date 30 days from the confirmation', async () => { 
 // Arrange
 const userId = 'user-001';
// Act
 const result = await confirmDeletion(userId, { password: 'correct-password' });

// Assert
 const scheduledAt = new Date(result.account.scheduledDeletionAt);
 const now = new Date();
 const diffDays = (scheduledAt - now) / (1000 * 60 * 60 * 24);
 expect(diffDays).toBeCloseTo(30, 0);

 
});
test('should not allow a deleted account to log in during the grace period', async () => { 
 // Arrange 
 const pendingUserId = 'user-pending-deletion';
// Act
const result = await login(pendingUserId, { password: 'correct-password' });

// Assert
 expect(result.success).toBe(false);
 expect(result.error).toMatch(/account.*pending deletion|scheduled for deletion/i);

 
});
});
// ── US-03: All User Data Is Removed After Deletion ────────────────────────
describe('US-26 | User Data Removed After Deletion', () => {
test('should remove the user profile after the account is permanently deleted', async () => { 
 // Arrange
 const deletedUserId = 'user-permanently-deleted';
// Act
const profile = await getProfile(deletedUserId);

// Assert
 expect(profile).toBeNull();

 
});
test('should remove all workout history after the account is permanently deleted', async () => { 
 // Arrange 
 const deletedUserId = 'user-permanently-deleted';
// Act
const history = await getWorkoutHistory(deletedUserId);

// Assert
 expect(history).toEqual([]);

 
});
test('should remove all reviews after the account is permanently deleted', async () => { 
 // Arrange
 const deletedUserId = 'user-permanently-deleted';
// Act
 const reviews = await getReviewsByUser(deletedUserId);

// Assert
 expect(reviews).toEqual([]);
});
});

// ── US-04: Cancel a Pending Deletion ─────────────────────────────────────
describe('US-27 | Cancel a Pending Deletion', () => {
test('should restore the account to active when the user cancels during the grace period', async () => { 
 // Arrange 
 const userId = 'user-pending-deletion';
// Act
 const result = await cancelDeletion(userId);

// Assert
 expect(result.success).toBe(true);
 expect(result.account.status).toBe('active');
 expect(result.account.scheduledDeletionAt).toBeNull();

 
});
test('should return an error when cancelling deletion on an account that is not pending', async () => { 
 // Arrange
 const activeUserId = 'user-001';
// Act
const result = await cancelDeletion(activeUserId);

// Assert
 expect(result.success).toBe(false);
 expect(result.error).toMatch(/no deletion.*pending|account.*active/i);
 
});
test('should return an error when cancelling after the grace period has expired', async () => { 
 // Arrange 
 const expiredUserId = 'user-grace-period-expired';
// Act
 const result = await cancelDeletion(expiredUserId);

// Assert
 expect(result.success).toBe(false);
expect(result.error).toMatch(/grace period.*expired|cannot cancel/i);
});
});
