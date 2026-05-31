import React, { useState, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { AppText } from './ui/AppText';
import { AppButton } from './ui/AppButton';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  label?: string;
  onSelect: (lat: number, lng: number) => void;
  height?: number;
}

export function MapPicker({ initialLat = 37.7749, initialLng = -122.4194, label, onSelect, height = 250 }: MapPickerProps) {
  const { colors } = useTheme();
  const [pin, setPin] = useState({ lat: initialLat, lng: initialLng });
  const mapRef = useRef<MapView>(null);
  const region: Region = { latitude: pin.lat, longitude: pin.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  return (
    <View style={styles.container}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <MapView
        ref={mapRef}
        style={[styles.map, { height }]}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        onPress={e => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          setPin({ lat: latitude, lng: longitude });
        }}>
        <Marker coordinate={{ latitude: pin.lat, longitude: pin.lng }} draggable
          onDragEnd={e => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setPin({ lat: latitude, lng: longitude });
          }} />
      </MapView>
      <AppButton title="Confirm Location" onPress={() => onSelect(pin.lat, pin.lng)} style={{ backgroundColor: colors.secondary, borderColor: colors.secondary }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  map: { width: '100%', borderRadius: 12, marginBottom: spacing.sm },
});
