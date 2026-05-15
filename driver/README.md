# UrbanMiles Driver App

UrbanMiles Driver App V1 is a standalone Expo app inside the existing monorepo. The operations screens still use mock/static data, while login can call the UrbanMiles web app driver auth API.

## Install

```bash
cd driver
npm install
```

## Run

```bash
npm run start
```

If testing login on a physical phone, the app auto-derives the Expo LAN host when possible and falls back to `http://192.168.50.45:3000`. You can override it explicitly:

```bash
EXPO_PUBLIC_URBANMILES_API_URL=http://YOUR_LAN_IP:3000 npm run start
```

You can also run:

```bash
npm run ios
npm run android
npm run web
```

## Notes

- Driver login posts to `POST /api/driver/login` with email/phone and password.
- Trip requests, driver profile, vehicle information, and earnings are mock data.
- The app is intentionally separate from `web/` and `mobile/` so those apps keep working unchanged.
