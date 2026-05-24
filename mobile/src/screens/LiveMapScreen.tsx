import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { SOSButton } from '../components/SOSButton';
import { RootStackParamList } from '../types';
import {
  joinPodRoom,
  leavePodRoom,
  onDriverLocation,
  onSosAlert,
  emitGpsUpdate,
} from '../services/socket';
import { startMockGPS } from '../services/mockGPS';
import { usePodStore } from '../store/podStore';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveMap'>;

export function LiveMapScreen({ route, navigation }: Props) {
  const { pod } = route.params;
  const { width, height } = useWindowDimensions();
  const mapRef = useRef<MapView>(null);
  const [driverPos, setDriverPos] = useState({
    lat: Number(pod.origin_lat),
    lng: Number(pod.origin_lng),
  });
  const setDriverLocation = usePodStore(s => s.setDriverLocation);
  const isDriver = pod.role === 'driver';
  const isActive = pod.status === 'active';

  const initialRegion: Region = {
    latitude: Number(pod.origin_lat),
    longitude: Number(pod.origin_lng),
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    joinPodRoom(pod.id);

    const unsubLocation = onDriverLocation(loc => {
      if (loc.podId === pod.id) {
        setDriverPos({ lat: loc.lat, lng: loc.lng });
        setDriverLocation({
          lat: loc.lat,
          lng: loc.lng,
          heading: loc.heading,
          speed: loc.speed,
          timestamp: loc.timestamp,
        });
      }
    });

    const unsubSos = onSosAlert(data => {
      if (data.rideId === pod.ride_id) {
        Alert.alert('SOS Alert', 'An emergency alert was triggered in this pod.');
      }
    });

    let stopMock: (() => void) | undefined;
    if (isDriver && isActive) {
      stopMock = startMockGPS(({ lat, lng, heading }) => {
        setDriverPos({ lat, lng });
        emitGpsUpdate(pod.id, lat, lng, heading);
      });
    }

    return () => {
      leavePodRoom(pod.id);
      unsubLocation();
      unsubSos();
      stopMock?.();
    };
  }, [pod.id, pod.ride_id, isDriver, isActive, setDriverLocation]);

  useEffect(() => {
    mapRef.current?.animateToRegion({
      latitude: driverPos.lat,
      longitude: driverPos.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  }, [driverPos]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: width * 0.05 }]}>
        <AppText variant="subtitle">{pod.name}</AppText>
        <AppText variant="caption">
          {isDriver ? 'Broadcasting location (mock GPS)' : 'Tracking driver live'}
        </AppText>
      </View>

      <MapView
        ref={mapRef}
        style={[styles.map, { height: height * 0.65 }]}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsCompass>
        <Marker
          coordinate={{ latitude: Number(pod.origin_lat), longitude: Number(pod.origin_lng) }}
          title="Origin"
          pinColor={colors.secondary}
        />
        <Marker
          coordinate={{ latitude: Number(pod.dest_lat), longitude: Number(pod.dest_lng) }}
          title="Destination"
          pinColor={colors.primary}
        />
        <Marker
          coordinate={{ latitude: driverPos.lat, longitude: driverPos.lng }}
          title="Driver"
          pinColor={colors.warning}
        />
      </MapView>

      <View style={[styles.footer, { paddingHorizontal: width * 0.05 }]}>
        <AppButton title="Back to Dashboard" variant="outline" onPress={() => navigation.goBack()} />
      </View>

      {isActive ? <SOSButton rideId={pod.ride_id} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  map: {
    width: '100%',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg,
  },
});
