import { Redirect, type Href } from 'expo-router';

export default function ConfirmationRoute() {
  return <Redirect href={'/completed' as Href} />;
}
