import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { colors, shadow } from '@/constants/theme';

export type DriverRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const operationRoute = [
  { latitude: 31.326, longitude: 75.5762 },
  { latitude: 31.224, longitude: 75.77 },
  { latitude: 31.121, longitude: 76.12 },
  { latitude: 30.969, longitude: 76.35 },
  { latitude: 30.84, longitude: 76.58 },
  { latitude: 30.7333, longitude: 76.7794 },
];

export function DriverMap({ region, recenterKey }: { region: DriverRegion; recenterKey: number }) {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (recenterKey > 0) {
      mapRef.current?.animateToRegion(region, 450);
    }
  }, [recenterKey, region]);

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={region}
      mapType="none"
      showsCompass
      showsScale
      showsUserLocation
      showsMyLocationButton={false}
    >
      <UrlTile maximumZ={19} tileSize={256} urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline coordinates={operationRoute} strokeColor="#f59e0b" strokeWidth={5} />
      <Marker coordinate={region} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={styles.vehicleMarker}>
          <Ionicons name="car-sport" size={24} color={colors.background} />
        </View>
      </Marker>
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  vehicleMarker: {
    alignItems: 'center',
    backgroundColor: colors.yellow,
    borderColor: '#fff',
    borderRadius: 999,
    borderWidth: 3,
    height: 54,
    justifyContent: 'center',
    width: 54,
    ...shadow,
  },
});
