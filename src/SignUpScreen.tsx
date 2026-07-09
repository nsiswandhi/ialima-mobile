import React, { useState } from 'react';
import {
  Pressable, StatusBar,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { API_BASE } from './config';
import { colors, fonts } from './theme';
import Header from './Header';
import KeyboardAwareScroll from './KeyboardAwareScroll';

// Required fields, mirroring the website Sign Up form (all marked *).
const FIELDS: { key: string; label: string; hint?: string; keyboard?: any; noCaps?: boolean; secure?: boolean }[] = [
  { key: 'email', label: 'Email', keyboard: 'email-address', noCaps: true },
  { key: 'phone', label: 'Phone', hint: '+62xxxxxxxxx', keyboard: 'phone-pad' },
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'angkatan', label: 'Angkatan', keyboard: 'number-pad' },
  { key: 'password', label: 'Password', secure: true, noCaps: true },
  { key: 'confirm_password', label: 'Confirm Password', secure: true, noCaps: true },
];

type Props = { onBackToLogin: () => void };

export default function SignUpScreen({ onBackToLogin }: Props) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSignup() {
    setError(null);

    // Client-side validation — same required fields as the website.
    for (const { key, label } of FIELDS) {
      if (!(form[key] || '').trim()) {
        setError(`${label} is required.`);
        return;
      }
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          email: form.email.trim(),
          phone: form.phone.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          angkatan: form.angkatan.trim(),
          password: form.password,
        }).toString(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Sign up failed');
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Success state — the account is created but must be activated by email.
  if (done) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Header title="Sign Up" onBack={onBackToLogin} />
        <View style={styles.successBox}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.successText}>
            We’ve sent an activation link to {form.email}. Click it to activate your
            account, then sign in.
          </Text>
          <Pressable style={styles.button} onPress={onBackToLogin}>
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header title="Sign Up" onBack={onBackToLogin} />
      <KeyboardAwareScroll contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          {FIELDS.map(({ key, label, hint, keyboard, noCaps, secure }) => (
            <View key={key} style={styles.fieldRow}>
              <Text style={styles.label}>
                {label.toUpperCase()} <Text style={styles.req}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={form[key] ?? ''}
                onChangeText={(t) => setField(key, t)}
                placeholder={label}
                placeholderTextColor={colors.muted}
                autoCapitalize={noCaps ? 'none' : 'sentences'}
                keyboardType={keyboard}
                secureTextEntry={secure}
              />
              {!!hint && <Text style={styles.hint}>{hint}</Text>}
            </View>
          ))}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing up…' : 'SIGN UP'}</Text>
          </Pressable>
        </View>

        <Pressable onPress={onBackToLogin} style={styles.linkRow}>
          <Text style={styles.link}>already have account? Sign In here..</Text>
        </Pressable>
      </KeyboardAwareScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 40, paddingBottom: 48, maxWidth: 460, width: '100%', alignSelf: 'center' },

  logo: { width: 72, height: 72, alignSelf: 'center', marginBottom: 8 },
  title: { fontFamily: fonts.heading, fontSize: 30, color: colors.primary, textAlign: 'center', marginBottom: 20 },

  card: {
    backgroundColor: colors.bgAlt, borderRadius: 16, padding: 18,
  },
  fieldRow: { marginBottom: 14 },
  label: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.5, color: colors.primary, marginBottom: 6 },
  req: { color: colors.accent },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: fonts.body, color: colors.heading,
  },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 5 },

  error: { color: colors.danger, fontFamily: fonts.bodyMedium, textAlign: 'center', marginBottom: 10 },

  button: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  buttonPressed: { backgroundColor: colors.accentDark },
  buttonText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 16, letterSpacing: 0.5 },

  linkRow: { alignItems: 'center', marginTop: 20 },
  link: { color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 14 },

  successBox: { flex: 1, justifyContent: 'center', padding: 28, maxWidth: 420, width: '100%', alignSelf: 'center' },
  successText: { fontFamily: fonts.body, fontSize: 15, color: colors.text, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
});
