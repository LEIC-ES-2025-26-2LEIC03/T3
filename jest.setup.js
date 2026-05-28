jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-sqlite', () => {
  const db = {
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve()),
    getFirstAsync: jest.fn(() => Promise.resolve({ v: 6 })),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    withTransactionAsync: jest.fn(fn => fn()),
  };

  return {
    openDatabaseAsync: jest.fn(() => Promise.resolve(db)),
    openDatabaseSync: jest.fn(() => db),
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('react-native-chart-kit', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    LineChart: props => React.createElement(View, {
      ...props,
      testID: props.testID ?? 'line-chart',
    }),
  };
}, { virtual: true });

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn()
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn()
}));