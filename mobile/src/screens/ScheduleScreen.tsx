import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { MapPicker } from '../components/MapPicker';
import { createSchedule, reverseGeocode } from '../services/api';
import { MainStackParamList } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { getErrorMessage } from '../services/api';
import { spacing, radius } from '../theme';

const DAYS = [
  { label: 'M', value: 1 }, { label: 'T', value: 2 }, { label: 'W', value: 3 },
  { label: 'T', value: 4 }, { label: 'F', value: 5 }, { label: 'S', value: 6 }, { label: 'S', value: 7 },
];

export function ScheduleScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [role, setRole] = useState<'driver' | 'rider'>('rider');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [departureTime, setDepartureTime] = useState('08:00');
  const [start, setStart] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [end, setEnd] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [step, setStep] = useState<'form' | 'start' | 'end'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleDay = (d: number) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const handleStartSelect = async (lat: number, lng: number) => {
    const geo = await reverseGeocode(lat, lng);
    setStart({ lat, lng, label: geo.label });
    setStep('end');
  };

  const handleEndSelect = async (lat: number, lng: number) => {
    const geo = await reverseGeocode(lat, lng);
    setEnd({ lat, lng, label: geo.label });
    setStep('form');
  };

  const save = async () => {
    if (!start || !end) { setError('Select start and end locations'); return; }
    setLoading(true);
    setError('');
    try {
      await createSchedule({
        role,
        startLat: start.lat,
        startLng: start.lng,
        endLat: end.lat,
        endLng: end.lng,
        startLabel: start.label,
        endLabel: end.label,
        daysOfWeek: days,
        departureTime: departureTime + ':00',
      });
      navigation.goBack();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'start') return (
    <ScreenContainer scroll>
      <AppText variant="title">Pick Start Point</AppText>
      <MapPicker onSelect={handleStartSelect} />
      <AppButton title="Cancel" variant="outline" onPress={() => setStep('form')} />
    </ScreenContainer>
  );

  if (step === 'end') return (
    <ScreenContainer scroll>
      <AppText variant="title">Pick End Point (Campus)</AppText>
      <MapPicker onSelect={handleEndSelect} initialLat={start?.lat} initialLng={start?.lng} />
      <AppButton title="Cancel" variant="outline" onPress={() => setStep('form')} />
    </ScreenContainer>
  );

  return (
    <ScreenContainer scroll>
      <AppText variant="title">Commute Schedule</AppText>
      <AppText variant="caption" style={styles.sub}>Recurring weekly schedule for matching</AppText>

      <View style={styles.roleRow}>
        {(['rider', 'driver'] as const).map(r => (
          <TouchableOpacity key={r} style={[styles.roleBtn, { borderColor: colors.border, backgroundColor: role === r ? colors.primary : colors.surface }]} onPress={() => setRole(r)}>
            <AppText variant="label" color={role === r ? '#FFF' : colors.text}>{r === 'driver' ? '🚗 Driver' : '🧑 Rider'}</AppText>
          </TouchableOpacity>
        ))}
      </View>

      <AppText variant="label">Days</AppText>
      <View style={styles.daysRow}>
        {DAYS.map(d => (
          <TouchableOpacity key={d.value} style={[styles.dayBtn, { backgroundColor: days.includes(d.value) ? colors.primary : colors.surface, borderColor: colors.border }]} onPress={() => toggleDay(d.value)}>
            <AppText variant="caption" color={days.includes(d.value) ? '#FFF' : colors.text}>{d.label}</AppText>
          </TouchableOpacity>
        ))}
      </View>

      <AppInput label="Departure Time (HH:MM)" value={departureTime} onChangeText={setDepartureTime} placeholder="08:00" />

      <AppButton title={start ? `Start: ${start.label.slice(0, 40)}...` : 'Select Start Location'} variant="outline" onPress={() => setStep('start')} />
      <AppButton title={end ? `End: ${end.label.slice(0, 40)}...` : 'Select End Location'} variant="outline" onPress={() => setStep('end')} />

      {error ? <AppText variant="caption" color={colors.error}>{error}</AppText> : null}
      <AppButton title="Save Schedule" onPress={save} loading={loading} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sub: { marginBottom: spacing.lg },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  roleBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  daysRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  dayBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
