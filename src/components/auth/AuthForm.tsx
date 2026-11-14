import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

import { signInWithEmail, signUpWithEmail } from '@/services/auth';

type AuthMode = 'sign-in' | 'sign-up';

export function AuthForm({ mode }: { mode: AuthMode }) {
  const isDark = useColorScheme() === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isSignUp = mode === 'sign-up';

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    if (isSignUp && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const result = isSignUp
        ? await signUpWithEmail(email.trim(), password)
        : await signInWithEmail(email.trim(), password);

      if (result.error) {
        setErrorMsg(result.error);
        return;
      }

      if (result.needsEmailConfirmation) {
        Alert.alert(
          'Confirm your email',
          'We sent a confirmation link to your inbox. Confirm it, then come back and sign in.'
        );
      }
      // Successful sign-in updates the auth session; the root navigator redirects.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Ionicons name="journal" size={32} color="#FFFFFF" />
            </View>
            <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              Scrapbook
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {isSignUp
                ? 'Create an account to sync your memories across devices.'
                : 'Welcome back. Sign in to sync your scrapbook.'}
            </Text>
          </View>

          {errorMsg ? (
            <View style={[styles.errorBox, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
              <Ionicons name="alert-circle-outline" size={18} color={isDark ? '#FCA5A5' : '#DC2626'} />
              <Text style={[styles.errorText, { color: isDark ? '#FECACA' : '#991B1B' }]}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.label, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>EMAIL</Text>
          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderColor: isDark ? '#374151' : '#E5E7EB',
              },
            ]}
          >
            <Ionicons name="mail-outline" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <TextInput
              style={[styles.input, { color: isDark ? '#F9FAFB' : '#111827' }]}
              placeholder="you@example.com"
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>

          <Text style={[styles.label, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>PASSWORD</Text>
          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderColor: isDark ? '#374151' : '#E5E7EB',
              },
            ]}
          >
            <Ionicons name="lock-closed-outline" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <TextInput
              style={[styles.input, { color: isDark ? '#F9FAFB' : '#111827' }]}
              placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              textContentType={isSignUp ? 'newPassword' : 'password'}
            />
            <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={isDark ? '#9CA3AF' : '#6B7280'}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: '#2563EB', opacity: submitting ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <Link
              href={isSignUp ? '/(auth)/sign-in' : '/(auth)/sign-up'}
              style={styles.switchLink}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  switchLink: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
