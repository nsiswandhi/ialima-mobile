import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from './theme';
import { recordError } from './analytics';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

// Catches render-time errors anywhere below it in the tree, reports them to
// Crashlytics, and shows a minimal fallback instead of a blank/crashed screen.
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    recordError(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>Please try again.</Text>
          <Pressable style={styles.button} onPress={() => this.setState({ hasError: false })}>
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24 },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.heading, marginBottom: 8 },
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.text, marginBottom: 20, textAlign: 'center' },
  button: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.white },
});
