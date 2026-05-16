import { Redirect, type Href } from 'expo-router';

export default function ModalRoute() {
  return <Redirect href={'/coupon' as Href} />;
}
