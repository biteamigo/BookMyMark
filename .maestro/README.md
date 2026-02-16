# Maestro flows for BookMyMark

Run flows from the **project root**:

```bash
# Run all flows in .maestro/flows/
maestro test .maestro/

# Run a single flow
maestro test .maestro/flows/01-root-screen.yaml
```

Ensure the app is installed on the device/emulator (e.g. `npx expo run:ios` or `npx expo run:android`) and that `appId` in `config.yaml` matches your build (Expo default: `com.biteamigo.BookMyMark` for both iOS and Android).
