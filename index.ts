import React from 'react';
import { registerRootComponent } from 'expo';

import App from './App';
import ErrorBoundary from './src/ErrorBoundary';
import { recordError } from './src/analytics';

// Catches JS exceptions that happen outside React's render (e.g. in async
// callbacks/timers) so they still reach Crashlytics instead of only crashing
// silently. Falls back to the previous handler (RN's default red-box/native
// crash reporting) after recording.
const defaultHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  recordError(error, { isFatal });
  defaultHandler(error, isFatal);
});

function Root() {
  return React.createElement(ErrorBoundary, null, React.createElement(App));
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
