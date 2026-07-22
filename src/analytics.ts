// Thin wrapper around @react-native-firebase/analytics + /crashlytics so call
// sites stay simple. Every call is wrapped in try/catch and no-ops quietly if
// Firebase isn't configured (e.g. a build without google-services.json) —
// tracking must never be able to crash or block the feature it's attached to.
//
// Expo Go has no native Firebase module, so a static import throws on load —
// which would take down every screen that imports this file. Guard it behind
// an Expo Go check and fall back to no-op stubs there.
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

const noopAnalytics = () => ({
  logScreenView: (..._args: any[]) => {},
  logEvent: (..._args: any[]) => {},
  setUserId: (..._args: any[]) => {},
});
const noopCrashlytics = () => ({
  log: (..._args: any[]) => {},
  recordError: (..._args: any[]) => {},
  setUserId: (..._args: any[]) => {},
});

const analytics: any = isExpoGo ? noopAnalytics : require('@react-native-firebase/analytics').default;
const crashlytics: any = isExpoGo ? noopCrashlytics : require('@react-native-firebase/crashlytics').default;

export function trackScreen(name: string) {
  try {
    analytics().logScreenView({ screen_name: name, screen_class: name });
  } catch {}
}

export function trackEvent(name: string, params?: Record<string, any>) {
  try {
    analytics().logEvent(name, params);
  } catch {}
}

export function trackFormResult(formName: string, success: boolean, errorMessage?: string) {
  try {
    analytics().logEvent(success ? 'form_submit_success' : 'form_submit_error', {
      form_name: formName,
      ...(errorMessage ? { error_message: errorMessage.slice(0, 100) } : {}),
    });
  } catch {}
}

export function recordError(error: Error, context?: Record<string, any>) {
  try {
    if (context) crashlytics().log(JSON.stringify(context));
    crashlytics().recordError(error);
  } catch {}
}

export function identifyUser(userId: string | number) {
  try {
    analytics().setUserId(String(userId));
    crashlytics().setUserId(String(userId));
  } catch {}
}

export function clearUser() {
  try {
    analytics().setUserId(null);
    crashlytics().setUserId('');
  } catch {}
}
