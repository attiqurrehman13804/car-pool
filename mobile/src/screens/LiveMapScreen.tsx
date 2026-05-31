import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { SOSButton } from '../components/SOSButton';
import { MainStackParamList } from '../types';
import { joinPodRoom, leavePodRoom, onDriverLocation, onSosAlert, onGeofenceArrival, emitGpsUpdate } from '../services/socket';
import { watchPosition, requestLocationPermission, getCurrentPosition } from '../services/location';
import { confirmPickup, completeRide, activatePod } from '../services/api';
import { usePodStore } from '../store/podStore';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'LiveMap'>;

export function LiveMapScreen({ route, navigation }: Props) {
  const { pod: initialPod } = route.params;
  const [pod, setPod] = useState(initialPod);
  const { colors } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [driverPos, setDriverPos] = useState({ lat: Number(pod.origin_lat), lng: Number(pod.origin_lng) });
  const [pickupOtp, setPickupOtp] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const setDriverLocation = usePodStore(s => s.setDriverLocation);
  const isDriver = pod.role === 'driver';
  const isActive = ['active', 'picked_up'].includes(pod.status);

  const routeCoords = [
    { latitude: Number(pod.origin_lat), longitude: Number(pod.origin_lng) },
    { latitude: driverPos.lat, longitude: driverPos.lng },
    { latitude: Number(pod.dest_lat), longitude: Number(pod.dest_lng) },
  ];

  useEffect(() => {
    joinPodRoom(pod.id);

    const unsubLocation = onDriverLocation(loc => {
      if (loc.podId === pod.id) {
        setDriverPos({ lat: loc.lat, lng: loc.lng });
        setDriverLocation({ lat: loc.lat, lng: loc.lng, heading: loc.heading, speed: loc.speed, timestamp: loc.timestamp });
      }
    });

    const unsubSos = onSosAlert(data => {
      if (data.rideId === pod.ride_id) {
        Alert.alert('SOS Alert', 'An emergency alert was triggered in this pod.');
      }
    });

    const unsubGeo = onGeofenceArrival(data => {
      if (data.podId === pod.id) {
        setStatusMsg('Driver is arriving at pickup point!');
        Alert.alert('Driver Arriving', 'Your driver is within 200m of your pickup.');
      }
    });

    let stopGps: (() => void) | undefined;

    const startGps = async () => {
      const granted = await requestLocationPermission();
      if (!granted) {
        setStatusMsg('Location permission denied');
        return;
      }
      if (isDriver && isActive) {
        stopGps = watchPosition(
          pos => {
            setDriverPos({ lat: pos.lat, lng: pos.lng });
            emitGpsUpdate(pod.id, pos.lat, pos.lng, pos.heading ?? 0, pos.speed ?? 0);
          },
          () => setStatusMsg('GPS error'),
        );
      }
    };

    if (isDriver && pod.status === 'scheduled') {
      activatePod(pod.id).then(r => {
        setPod(p => ({ ...p, status: 'active' }));
        if (r.pickupOtp) setStatusMsg(`Pickup OTP: ${r.pickupOtp}`);
      }).catch(() => {});
    }

    startGps();

    return () => {
      leavePodRoom(pod.id);
      unsubLocation();
      unsubSos();
      unsubGeo();
      stopGps?.();
    };
  }, [pod.id, pod.ride_id, isDriver, isActive, setDriverLocation]);

  useEffect(() => {
    mapRef.current?.animateToRegion({
      latitude: driverPos.lat, longitude: driverPos.lng,
      latitudeDelta: 0.02, longitudeDelta: 0.02,
    });
  }, [driverPos]);

  const handleConfirmPickup = async () => {
    try {
      await confirmPickup(pod.ride_id, pickupOtp);
      setPod(p => ({ ...p, status: 'picked_up' }));
      Alert.alert('Success', 'Pickup confirmed!');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Invalid OTP');
    }
  };

  const handleComplete = async () => {
    try {
      await completeRide(pod.ride_id);
      Alert.alert('Ride Complete', 'Commute marked as completed.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <AppText variant="subtitle">{pod.name}</AppText>
        <AppText variant="caption">{isDriver ? 'Broadcasting GPS' : 'Tracking driver'} • {pod.status}</AppText>
        {statusMsg ? <AppText variant="caption" color={colors.success}>{statusMsg}</AppText> : null}
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{ latitude: driverPos.lat, longitude: driverPos.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        showsCompass>
        <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={3} />
        <Marker coordinate={{ latitude: Number(pod.origin_lat), longitude: Number(pod.origin_lng) }} title="Origin" pinColor={colors.secondary} />
        <Marker coordinate={{ latitude: Number(pod.dest_lat), longitude: Number(pod.dest_lng) }} title="Destination" pinColor={colors.primary} />
        <Marker coordinate={{ latitude: driverPos.lat, longitude: driverPos.lng }} title="Driver" pinColor={colors.warning} />
        {pod.members?.filter(m => m.pickup_lat).map(m => (
          <Marker key={m.id} coordinate={{ latitude: Number(m.pickup_lat), longitude: Number(m.pickup_lng) }} title={m.pickup_label ?? 'Pickup'} pinColor="#9333EA" />
        ))}
      </MapView>

      <View style={[styles.footer, { backgroundColor: colors.surface }]}>
        {!isDriver && isActive && pod.status === 'active' ? (
          <>
            <AppInput label="Pickup OTP" value={pickupOtp} onChangeText={setPickupOtp} keyboardType="number-pad" maxLength={6} placeholder="Enter OTP from driver" />
            <AppButton title="Confirm Pickup" onPress={handleConfirmPickup} />
          </>
        ) : null}
        {isDriver && isActive ? (
          <AppButton title="Complete Ride" variant="secondary" onPress={handleComplete} />
        ) : null}
        <AppButton title="Chat" variant="outline" onPress={() => navigation.navigate('Chat', { podId: pod.id, podName: pod.name })} />
        <AppButton title="Back" variant="outline" onPress={() => navigation.goBack()} />
      </View>

      {isActive ? <SOSButton rideId={pod.ride_id} getLocation={getCurrentPosition} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: spacing.lg, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  map: { flex: 1 },
  footer: { padding: spacing.md, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
});
