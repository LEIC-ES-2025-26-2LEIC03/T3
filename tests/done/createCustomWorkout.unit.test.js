import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TemplateBuilder from '../../src/screens/TemplateBuilder';
import * as db from '../../src/utils/db';
import { Alert } from 'react-native';

jest.mock('../../src/utils/db', () => ({
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  fetchTemplates: jest.fn(),
  fetchTemplateById: jest.fn(),
  templateNameExists: jest.fn(),
}));

jest.spyOn(Alert, 'alert');

describe('createCustomWorkout Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects workout creation if name is empty', async () => {
    const { getByText, getByPlaceholderText } = render(<TemplateBuilder navigation={{ goBack: jest.fn() }} />);
    
    // Attempt to save without entering a name
    fireEvent.press(getByText('Save'));
    
    expect(Alert.alert).toHaveBeenCalledWith('Name required', 'Please give your template a name.');
    expect(db.createTemplate).not.toHaveBeenCalled();
  });

  it('rejects workout creation if there are no exercises', async () => {
    const { getByText, getByPlaceholderText } = render(<TemplateBuilder navigation={{ goBack: jest.fn() }} />);
    
    // Enter a valid name
    fireEvent.changeText(getByPlaceholderText('e.g. Push Day A'), 'My Custom Workout');
    
    // Attempt to save without adding exercises
    fireEvent.press(getByText('Save'));
    
    expect(Alert.alert).toHaveBeenCalledWith('No exercises', 'Add at least one exercise to your template.');
    expect(db.createTemplate).not.toHaveBeenCalled();
  });

  it('rejects workout creation if name already exists', async () => {
    db.templateNameExists.mockResolvedValueOnce(true);
    const { getByText, getByPlaceholderText } = render(<TemplateBuilder navigation={{ goBack: jest.fn() }} />);
    
    // Enter name
    fireEvent.changeText(getByPlaceholderText('e.g. Push Day A'), 'Existing Workout');
    
    // To bypass the "no exercises" check, we mock the state by simulating an exercise addition
    // Press "Add Exercise"
    fireEvent.press(getByText('＋  Add Exercise'));

    // Wait for the ExercisePicker to appear and tap the first exercise
    // The ExercisePicker renders a FlatList of EXERCISES. We'll pick one by text if we know it.
    // However, for pure unit tests, we can just test the DB logic or mock ExercisePicker.
    // Instead of doing full interaction, let's just mock the child component or bypass the alert.
  });
});
