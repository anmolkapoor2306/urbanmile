import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, UrlTile, type MapPressEvent } from 'react-native-maps';
import { useThemeColors } from '@/src/context/AppContext';
import { shadow } from '@/src/constants/theme';

export type PickerCoordinate = {
  latitude: number;
  longitude: number;
};

export function LocationPickerMap({
  coordinate,
  onCoordinateChange,
}: {
  coordinate: PickerCoordinate;
  onCoordinateChange: (coordinate: PickerCoordinate) => void;
}) {
  const c = useThemeColors();

  function handleMapPress(event: MapPressEvent) {
    onCoordinateChange(event.nativeEvent.coordinate);
  }

  const styles = useMemo(() => StyleSheet.create({
    map: {
      flex: 1,
    },
    marker: {
      alignItems: 'center',
      backgroundColor: c.yellow,
      borderColor: c.surface,
      borderRadius: 999,
      borderWidth: 3,
      height: 54,
      justifyContent: 'center',
      width: 54,
      ...shadow,
    },
  }), [c]);

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        ...coordinate,
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      }}
      mapType="none"
      onPress={handleMapPress}
      showsCompass
      showsScale
      showsUserLocation
      showsMyLocationButton={false}
    >
      <UrlTile maximumZ={19} tileSize={256} urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker
        coordinate={coordinate}
        draggable
        anchor={{ x: 0.5, y: 1 }}
        onDragEnd={(event) => onCoordinateChange(event.nativeEvent.coordinate)}
      >
        <View style={styles.marker}>
          <Ionicons name="location" size={28} color={c.ink} />
        </View>
      </Marker>
    </MapView>
  );
}
