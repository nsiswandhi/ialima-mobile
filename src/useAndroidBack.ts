import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

// Registers a hardware-back-button handler for Android. `handler` should
// return true when it popped an internal view (consuming the press), or
// false to let the press fall through to the next-outer handler — eventually
// App.tsx's top-level handler, or finally the OS default of exiting the app.
// Screens with their own list/detail/form-style local view state each call
// this once, unconditionally, so nested back-stacks compose correctly (the
// most-recently-mounted/innermost screen's listener fires first).
export function useAndroidBack(handler: () => boolean) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => ref.current());
    return () => sub.remove();
  }, []);
}
