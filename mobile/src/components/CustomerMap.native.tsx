import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { useThemeColors } from '@/src/context/AppContext';
import { shadow } from '@/src/constants/theme';

export type CustomerRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export function CustomerMap({ region, recenterKey }: { region: CustomerRegion; recenterKey: number }) {
  const mapRef = useRef<MapView | null>(null);
  const c = useThemeColors();

  useEffect(() => {
    if (recenterKey > 0) {
      mapRef.current?.animateToRegion(region, 450);
    }
  }, [recenterKey, region]);

  const styles = useMemo(() => StyleSheet.create({
    map: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    marker: {
      alignItems: 'center',
      backgroundColor: c.yellow,
      borderColor: c.surface,
      borderRadius: 999,
      borderWidth: 3,
      height: 48,
      justifyContent: 'center',
      width: 48,
      ...shadow,
    },
  }), [c]);

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
      <Marker coordinate={region} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={styles.marker}>
          <Ionicons name="person" size={22} color={c.ink} />
        </View>
      </Marker>
    </MapView>
  );
}
