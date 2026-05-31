import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { fetchVehicles, createVehicle, deleteVehicle } from '../services/api';
import { Vehicle } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme';
import { getErrorMessage } from '../services/api';

export function VehiclesScreen() {
  const { colors } = useTheme();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [seats, setSeats] = useState('4');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try { setVehicles(await fetchVehicles()); } catch { /* empty */ }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async () => {
    setError('');
    try {
      await createVehicle({ make, model, licensePlate: plate, seatCapacity: parseInt(seats, 10) });
      setMake(''); setModel(''); setPlate(''); setShowForm(false);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <ScreenContainer scroll>
      <AppText variant="title">My Vehicles</AppText>
      <FlatList
        data={vehicles}
        scrollEnabled={false}
        keyExtractor={v => v.id}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AppText variant="subtitle">{item.make} {item.model}</AppText>
            <AppText variant="caption">{item.license_plate} • {item.seat_capacity} seats</AppText>
            <AppButton title="Remove" variant="danger" onPress={() => deleteVehicle(item.id).then(load)} />
          </View>
        )}
        ListEmptyComponent={<AppText variant="caption">No vehicles registered</AppText>}
      />
      {showForm ? (
        <>
          <AppInput label="Make" value={make} onChangeText={setMake} />
          <AppInput label="Model" value={model} onChangeText={setModel} />
          <AppInput label="License Plate" value={plate} onChangeText={setPlate} />
          <AppInput label="Seats" value={seats} onChangeText={setSeats} keyboardType="number-pad" />
          {error ? <AppText variant="caption" color={colors.error}>{error}</AppText> : null}
          <AppButton title="Add Vehicle" onPress={add} />
        </>
      ) : (
        <AppButton title="Register Vehicle" onPress={() => setShowForm(true)} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
});
