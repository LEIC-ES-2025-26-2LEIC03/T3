import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../../src/screens/HomeScreen';
import { TEMPLATES as EXAMPLE_TEMPLATES } from '../../src/data/templates';

// Mock dependencies
jest.mock('../../src/utils/firestoreDb', () => ({
  fetchTemplates: jest.fn(() => Promise.resolve([])), // Return no custom templates for this test
  buildExercisesFromTemplate: jest.fn((ids) => ids.map(id => ({ id: 'mocked', exerciseId: id }))),
  deleteTemplate: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: (cb) => {
      React.useEffect(() => {
        cb();
      }, []);
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('accessPremadeWorkoutRoutines Integration Tests', () => {
  it('renders example templates on the HomeScreen', async () => {
    const { getByText } = render(<HomeScreen navigation={{ navigate: jest.fn() }} />);
    
    // Wait for the component to finish loading custom templates
    await waitFor(() => {
      // The section header should be visible
      expect(getByText('Example Templates')).toBeTruthy();
    });

    // Check if the first example template name is rendered
    expect(getByText(EXAMPLE_TEMPLATES[0].name)).toBeTruthy();
  });

  it('navigates to WorkoutLogger with preloaded exercises when an example template is tapped', async () => {
    const mockNavigate = jest.fn();
    const { getByText } = render(<HomeScreen navigation={{ navigate: mockNavigate }} />);

    await waitFor(() => {
      expect(getByText('Example Templates')).toBeTruthy();
    });

    // Tap the first example template
    const firstTemplateName = EXAMPLE_TEMPLATES[0].name;
    fireEvent.press(getByText(firstTemplateName));

    // Wait for the navigation to be called
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('WorkoutLogger', expect.objectContaining({
        workoutName: firstTemplateName,
        preloadedExercises: expect.any(Array),
      }));
    });

    // Verify the exercises array is populated correctly from static data
    const navigationArgs = mockNavigate.mock.calls[0][1];
    expect(navigationArgs.preloadedExercises.length).toBe(EXAMPLE_TEMPLATES[0].exercises.length);
    expect(navigationArgs.preloadedExercises[0]).toHaveProperty('exerciseId', EXAMPLE_TEMPLATES[0].exercises[0]);
  });
});
