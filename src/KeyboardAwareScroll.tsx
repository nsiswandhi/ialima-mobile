import React from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView,
  StyleProp, ViewStyle,
} from 'react-native';

type Props = {
  children: React.ReactNode;
  // Style for the ScrollView itself (usually flex: 1).
  style?: StyleProp<ViewStyle>;
  // Style for the inner content (padding, centering, etc).
  contentContainerStyle?: StyleProp<ViewStyle>;
  // Extra space (e.g. a header height) to offset the keyboard avoidance by.
  keyboardVerticalOffset?: number;
};

/**
 * Wraps scrollable form content so the keyboard never covers the fields.
 *
 * On Android (edge-to-edge, where `adjustResize` no longer applies on its own)
 * `behavior="height"` shrinks the scroll viewport to the space above the
 * keyboard, so every field can be scrolled into view. On iOS `behavior="padding"`
 * adds matching bottom padding. `keyboardShouldPersistTaps="handled"` keeps taps
 * on buttons/fields working while the keyboard is open.
 */
export default function KeyboardAwareScroll({
  children, style, contentContainerStyle, keyboardVerticalOffset = 0,
}: Props) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        style={style}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
