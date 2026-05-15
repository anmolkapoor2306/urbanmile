declare module '@/components/DriverMap' {
  import type { ReactElement } from 'react';

  export type DriverRegion = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };

  export function DriverMap(props: { region: DriverRegion; recenterKey: number }): ReactElement;
}
