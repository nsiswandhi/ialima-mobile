// Branded boot/loading screen — takes over from the native splash the moment
// the JS bundle mounts (see App.tsx's SplashScreen.hideAsync() call), stays
// up while fonts load, then unmounts once the app is ready. Two overlaid
// LinearGradient layers slowly cross-fade to give the brand-color background
// a slow "drifting" feel, using only React Native's built-in Animated API.
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { colors, fonts } from './theme';

const logo = require('../assets/logo.png');

export default function BootScreen() {
  const fade = useRef(new Animated.Value(0)).current;

  // Dismiss the native splash the instant this screen has mounted and
  // painted — same background/logo, so the handoff is invisible.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fade, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fade]);

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={[colors.primary, colors.secondary, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <LinearGradient
          colors={[colors.accentDark, colors.primary, colors.secondary]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.content}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.wordmark}>LIMA CIRCLE</Text>
        <Text style={styles.tagline}>CONNECT . GROW . SUPPORT .</Text>
        <ActivityIndicator color={colors.white} style={styles.spinner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 96, height: 96, marginBottom: 18 },
  wordmark: {
    fontFamily: fonts.heading, fontSize: 26, color: colors.white,
    letterSpacing: 2, textAlign: 'center',
  },
  tagline: {
    fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.white,
    letterSpacing: 1.5, textAlign: 'center', marginTop: 8, opacity: 0.9,
  },
  spinner: { marginTop: 32 },
});
