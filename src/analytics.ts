// Thin wrapper around @react-native-firebase/analytics + /crashlytics so call
// sites stay simple. Every call is wrapped in try/catch and no-ops quietly if
// Firebase isn't configured (e.g. a build without google-services.json) —
// tracking must never be able to crash or block the feature it's attached to.
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';

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
