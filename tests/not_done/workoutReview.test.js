
// ── US-01: Submit a Star Rating for an Exercise ───────────────────────────

describe('US-11 | Submit a Star Rating for an Exercise', () => {

  test('should save a rating when the user selects a value between 1 and 5', async () => {
    // Arrange
    const reviewData = {
      sessionId: 'session-001',
      exerciseId: 'exercise-bench-press',
      stars: 4,
    };

    // Act
    const result = await submitReview(reviewData);

    // Assert
    expect(result.success).toBe(true);
    expect(result.review.stars).toBe(4);
    expect(result.review.exerciseId).toBe('exercise-bench-press');
    expect(result.review.sessionId).toBe('session-001');
  });

  test('should reject a rating of 0', async () => {
    // Arrange
    const invalidReview = {
      sessionId: 'session-001',
      exerciseId: 'exercise-bench-press',
      stars: 0,
    };

    // Act
    const result = await submitReview(invalidReview);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/stars.*invalid|rating.*out of range/i);
  });

  test('should reject a rating greater than 5', async () => {
    // Arrange
    const invalidReview = {
      sessionId: 'session-001',
      exerciseId: 'exercise-bench-press',
      stars: 6,
    };

    // Act
    const result = await submitReview(invalidReview);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/stars.*invalid|rating.*out of range/i);
  });

  test('should reject a non-integer rating', async () => {
    // Arrange
    const invalidReview = {
      sessionId: 'session-001',
      exerciseId: 'exercise-bench-press',
      stars: 3.5,
    };

    // Act
    const result = await submitReview(invalidReview);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/stars.*integer|whole number/i);
  });

  test('should only allow one review per exercise per session', async () => {
    // Arrange — submit first review
    const reviewData = {
      sessionId: 'session-001',
      exerciseId: 'exercise-bench-press',
      stars: 3,
    };
    await submitReview(reviewData);

    // Act — attempt a second submission for the same exercise in the same session
    const result = await submitReview({ ...reviewData, stars: 5 });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already reviewed|duplicate/i);
  });

});

// ── US-02: Edit a Star Rating ─────────────────────────────────────────────

describe('US-12 | Edit a Star Rating', () => {

  test('should update the rating when the user changes their existing review', async () => {
    // Arrange
    const reviewId = 'review-001';

    // Act
    const result = await editReview(reviewId, { stars: 2 });

    // Assert
    expect(result.success).toBe(true);
    expect(result.review.stars).toBe(2);
  });

  test('should not allow editing a review from a session that has been deleted', async () => {
    // Arrange
    const orphanedReviewId = 'review-orphaned';

    // Act
    const result = await editReview(orphanedReviewId, { stars: 5 });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/session.*not found|review.*invalid/i);
  });

});

// ── US-03: Delete a Star Rating ───────────────────────────────────────────

describe('US-13 | Delete a Star Rating', () => {

  test('should remove the review when the user deletes their rating', async () => {
    // Arrange
    const reviewId = 'review-001';

    // Act
    const result = await deleteReview(reviewId);

    // Assert
    expect(result.success).toBe(true);
    const review = await getReview(reviewId);
    expect(review).toBeNull();
  });

  test('should return an error when deleting a review that does not exist', async () => {
    // Arrange
    const nonExistentReviewId = 'review-ghost';

    // Act
    const result = await deleteReview(nonExistentReviewId);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

});

// ── US-04: View Your Own Review for an Exercise ───────────────────────────

describe('US-14 | View Your Own Review', () => {

  test('should return the star rating the user submitted for a given exercise in a session', async () => {
    // Arrange
    const sessionId = 'session-001';
    const exerciseId = 'exercise-bench-press';

    // Act
    const review = await getReviewForExercise(sessionId, exerciseId);

    // Assert
    expect(review).toBeDefined();
    expect(review.stars).toBeGreaterThanOrEqual(1);
    expect(review.stars).toBeLessThanOrEqual(5);
  });

  test('should return null when no review exists for that exercise in that session', async () => {
    // Arrange
    const sessionId = 'session-001';
    const exerciseId = 'exercise-never-reviewed';

    // Act
    const review = await getReviewForExercise(sessionId, exerciseId);

    // Assert
    expect(review).toBeNull();
  });

});

// ── US-05: See the Average Rating for an Exercise ─────────────────────────

describe('US-15 | Average Rating Across Sessions', () => {

  test('should return the mean star rating across all sessions where the exercise was reviewed', async () => {
    // Arrange
    // session-001 → 4 stars, session-002 → 2 stars, expected avg → 3.0
    const exerciseId = 'exercise-bench-press';

    // Act
    const result = await getAverageRating(exerciseId);

    // Assert
    expect(result.averageStars).toBe(3.0);
    expect(result.reviewCount).toBe(2);
  });

  test('should return null for average rating when the exercise has never been reviewed', async () => {
    // Arrange
    const exerciseId = 'exercise-no-reviews';

    // Act
    const result = await getAverageRating(exerciseId);

    // Assert
    expect(result.averageStars).toBeNull();
    expect(result.reviewCount).toBe(0);
  });

});

// ── US-06: Prompt the User to Rate After Finishing a Session ──────────────

describe('US-17 | Review Prompt After Session', () => {

  test('should include a review prompt for each exercise when a session is finished', async () => {
    // Arrange
    const sessionId = 'session-001';

    // Act
    const result = await finishSession(sessionId);

    // Assert
    expect(result.reviewPrompts).toBeDefined();
    expect(Array.isArray(result.reviewPrompts)).toBe(true);
    result.reviewPrompts.forEach(prompt => {
      expect(prompt.exerciseId).toBeDefined();
      expect(prompt.exerciseName).toBeDefined();
    });
  });

  test('should not include a review prompt for exercises the user already rated mid-session', async () => {
    // Arrange — session where bench press was already reviewed before finishing
    const sessionId = 'session-already-reviewed';
    const reviewedExerciseId = 'exercise-bench-press';

    // Act
    const result = await finishSession(sessionId);

    // Assert
    const alreadyPrompted = result.reviewPrompts.find(
      p => p.exerciseId === reviewedExerciseId
    );
    expect(alreadyPrompted).toBeUndefined();
  });

});

// ── US-07: Star Rating Visible in Workout History ─────────────────────────

describe('US-18 | Rating Displayed in Workout History', () => {

  test('should include star ratings on each reviewed exercise in the history view', async () => {
    // Arrange
    const userId = 'user-001';

    // Act
    const history = await getWorkoutHistory(userId);

    // Assert
    const session = history[0];
    const reviewedExercise = session.exercises.find(e => e.review);
    expect(reviewedExercise.review.stars).toBeGreaterThanOrEqual(1);
    expect(reviewedExercise.review.stars).toBeLessThanOrEqual(5);
  });

  test('should show no rating for exercises that were not reviewed', async () => {
    // Arrange
    const userId = 'user-001';

    // Act
    const history = await getWorkoutHistory(userId);

    // Assert
    const session = history[0];
    const unreviewedExercise = session.exercises.find(e => !e.review);
    expect(unreviewedExercise.review).toBeNull();
  });

});

// ── US-08: Exercises Without a Rating Have a Clear Unrated State ──────────

describe('US-19 | Unrated Exercise State', () => {

  test('should expose an explicit unrated flag when no review exists for an exercise', async () => {
    // Arrange
    const sessionId = 'session-001';
    const exerciseId = 'exercise-never-reviewed';

    // Act
    const exercise = await getExerciseInSession(sessionId, exerciseId);

    // Assert
    expect(exercise.review).toBeNull();
    expect(exercise.isReviewed).toBe(false);
  });

  test('should mark the exercise as reviewed once a rating is submitted', async () => {
    // Arrange
    const sessionId = 'session-001';
    const exerciseId = 'exercise-bench-press';

    // Act
    await submitReview({ sessionId, exerciseId, stars: 5 });
    const exercise = await getExerciseInSession(sessionId, exerciseId);

    // Assert
    expect(exercise.isReviewed).toBe(true);
    expect(exercise.review.stars).toBe(5);
  });

});
