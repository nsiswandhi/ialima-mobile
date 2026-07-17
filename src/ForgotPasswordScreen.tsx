// Two-step password recovery: request a 6-digit code by phone, then use it
// (with a new password) to reset. Mirrors SignUpScreen.tsx's structure/style
// and its raw-fetch convention (no dedicated api.ts, same as login/signup).
import React, { useState } from 'react';
import {
  Pressable, StatusBar,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { API_BASE } from './config';
import { colors, fonts } from './theme';
import Header from './Header';
import KeyboardAwareScroll from './KeyboardAwareScroll';

type Props = { onBackToLogin: () => void };

export default function ForgotPasswordScreen({ onBackToLogin }: Props) {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestCode() {
    setError(null);
    if (!phone.trim()) {
      setError('Phone is required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ phone: phone.trim() }).toString(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not send reset code');
      setStep('reset');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setError(null);
    if (!code.trim() || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          phone: phone.trim(),
          code: code.trim(),
          new_password: newPassword,
        }).toString(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not reset password');
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Success state.
  if (step === 'done') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Header title="Lupa Password" onBack={onBackToLogin} />
        <View style={styles.successBox}>
          <Text style={styles.title}>Password Berhasil Diubah</Text>
          <Text style={styles.successText}>
            Password kamu sudah berhasil diubah. Silakan masuk dengan password baru.
          </Text>
          <Pressable style={styles.button} onPress={onBackToLogin}>
            <Text style={styles.buttonText}>Kembali ke Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header title="Lupa Password" onBack={onBackToLogin} />
      <KeyboardAwareScroll contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          {step === 'request' ? (
            <>
              <Text style={styles.intro}>
                Masukkan nomor HP yang kamu gunakan untuk masuk. Kami akan mengirimkan kode reset
                ke email yang terdaftar.
              </Text>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>PHONE</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+62xxxxxxxxxx"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  keyboardType="phone-pad"
                />
              </View>

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                onPress={handleRequestCode}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? 'Mengirim…' : 'Kirim Kode'}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.intro}>
                Masukkan kode 6 digit yang dikirim ke email kamu, lalu buat password baru.
              </Text>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>KODE</Text>
                <TextInput
                  style={styles.input}
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>PASSWORD BARU</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Password baru"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  secureTextEntry
                />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>KONFIRMASI PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Ulangi password baru"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  secureTextEntry
                />
              </View>

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? 'Menyimpan…' : 'Reset Password'}</Text>
              </Pressable>

              <Pressable onPress={() => setStep('request')} style={styles.linkRow}>
                <Text style={styles.link}>Kirim ulang kode</Text>
              </Pressable>
            </>
          )}
        </View>

        <Pressable onPress={onBackToLogin} style={styles.linkRow}>
          <Text style={styles.link}>Kembali ke Sign In</Text>
        </Pressable>
      </KeyboardAwareScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 40, paddingBottom: 48, maxWidth: 460, width: '100%', alignSelf: 'center' },

  title: { fontFamily: fonts.heading, fontSize: 30, color: colors.primary, textAlign: 'center', marginBottom: 20 },

  card: {
    backgroundColor: colors.bgAlt, borderRadius: 16, padding: 18,
  },
  intro: { fontFamily: fonts.body, fontSize: 13.5, color: colors.text, lineHeight: 20, marginBottom: 16 },
  fieldRow: { marginBottom: 14 },
  label: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.5, color: colors.primary, marginBottom: 6 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: fonts.body, color: colors.heading,
  },

  error: { color: colors.danger, fontFamily: fonts.bodyMedium, textAlign: 'center', marginBottom: 10 },

  button: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  buttonPressed: { backgroundColor: colors.accentDark },
  buttonText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 16, letterSpacing: 0.5 },

  linkRow: { alignItems: 'center', marginTop: 20 },
  link: { color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 14 },

  successBox: { flex: 1, justifyContent: 'center', padding: 28, maxWidth: 420, width: '100%', alignSelf: 'center' },
  successText: { fontFamily: fonts.body, fontSize: 15, color: colors.text, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
});
