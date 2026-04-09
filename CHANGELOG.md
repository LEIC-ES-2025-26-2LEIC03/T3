# Changelog

All notable changes to IronLog are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [v0.1.0] - 2026-04-09 — Sprint 0: Vertical Prototype

### Added
- **Log a Workout Session** (User Story 1 — fully functional)
  - Pick a workout template: Push Day, Pull Day, Leg Day, or Custom
  - Add exercises from a searchable, categorized library (16 predefined)
  - Log sets with weight (kg) and reps per exercise
  - Mark individual sets as done with a single tap
  - Add and remove sets per exercise
  - Add and remove exercises during an active workout
  - Live elapsed timer during workout session
  - Finish Workout with confirmation dialog showing set/volume summary
  - Validation: cannot finish without at least one exercise
  - Workout saved to local storage with timestamp (AsyncStorage)
  - Workout Summary screen: duration, total volume, sets completed
  - History screen: chronological list of all saved workouts

### Technical
- React Native 0.73.6 with React Navigation 6
- Global state via Context + useReducer
- Persistent storage via @react-native-async-storage/async-storage
- GitHub Actions: CI (lint + tests), Android release build, code quality

### Closed PBIs
- #1 — Start a new workout from a template
- #2 — Add an exercise to a workout
- #3 — Log a set with weight and reps
- #4 — Mark a set as done
- #5 — Finish and save a workout
- #6 — View workout history

---
