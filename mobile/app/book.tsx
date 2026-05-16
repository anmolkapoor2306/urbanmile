import { Redirect, type Href } from 'expo-router';

export default function BookRoute() {
  return <Redirect href={'/destination-search' as Href} />;
}
