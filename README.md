# BookMyMark

A React Native mobile application for organizing and managing bookmarks into folders. Built with Expo SDK 54.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.19.4 (required for Expo SDK 54)
- **npm** or **yarn**
- **Expo Go** app on your mobile device (for testing on physical devices)
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Checking Node.js Version

```bash
node -v
```

If you need to upgrade Node.js, you can use nvm (Node Version Manager):

```bash
# Install Node.js 24 (or any version >= 20.19.4)
nvm install 24
nvm use 24

# Make it the default
nvm alias default 24
```

## Installation

1. **Clone the repository** (if you haven't already):

```bash
git clone <repository-url>
cd BookMyMark
```

2. **Install dependencies**:

```bash
npm install
```

If you encounter peer dependency issues, use:

```bash
npm install --legacy-peer-deps
```

## Running the App

### Start the Development Server

```bash
npm start
```

Or using Expo CLI directly:

```bash
npx expo start
```

This will open Expo Dev Tools in your terminal with a QR code.

### Running on Specific Platforms

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server with QR code |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |
| `npm run web` | Run in web browser |

### Running on Your Phone

1. Install the **Expo Go** app on your phone
2. Run `npm start` in your terminal
3. Scan the QR code:
   - **iOS**: Use the Camera app
   - **Android**: Use the Expo Go app's scanner

### Clear Cache (if needed)

If you encounter issues, try clearing the cache:

```bash
npx expo start --clear
```

## Unit Testing

The project uses **Jest** and **React Native Testing Library** for unit testing.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Running Specific Tests

```bash
# Run tests for a specific file or pattern
npm test SearchBar

# Run tests matching a pattern
npm test -- --testNamePattern="renders"
```

### Test Structure

Tests are organized in `__tests__` folders alongside the source files:

```
src/
├── Classes/
│   └── __tests__/
│       ├── BookMark.test.js
│       └── Category.test.js
├── Components/
│   └── __tests__/
│       ├── SearchBar.test.js
│       ├── MenuItem.test.js
│       ├── DropdownMenu.test.js
│       └── ...
├── Context/
│   └── __tests__/
│       └── FolderContext.test.js
└── Screens/
    └── __tests__/
        └── HomeScreen.test.js
```

### Writing New Tests

Example test file structure:

```javascript
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import MyComponent from "../MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Expected Text")).toBeOnTheScreen();
  });

  it("handles user interaction", () => {
    const mockHandler = jest.fn();
    render(<MyComponent onPress={mockHandler} />);
    
    fireEvent.press(screen.getByText("Button"));
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

## E2E Testing

### Prerequisites for End-to-End tests

E2E tests use [Maestro](https://maestro.mobile.dev), a mobile UI testing framework. Maestro is **free and open source** for local testing and for running in CI (e.g. GitHub Actions) with emulators.

**Install Maestro (macOS)**

Using [Homebrew](https://brew.sh):

```bash
brew tap mobile-dev-inc/tap
brew install maestro
```

Verify the installation:

```bash
maestro --version
```

**Optional:** To disable anonymous analytics when running Maestro, set this before running tests:

```bash
export MAESTRO_CLI_NO_ANALYTICS=1
```

**Other requirements**

- **Android E2E:** Android Studio (for the Android SDK and emulator). Ensure `ANDROID_HOME` is set (Android Studio usually does this; if not, set it to your SDK path, e.g. `~/Library/Android/sdk` on macOS).
- **iOS E2E:** Xcode and iOS Simulator (not covered in the Android steps below).

Flows live in `.maestro/flows/`. The app ID and inclusion patterns are in `.maestro/config.yaml`.

### Android E2E testing (Maestro)

**Manual steps**  
Follow these steps to run Maestro E2E tests on an Android emulator. All commands are run from the **project root** (`BookMyMark/`).

**1. Install Android Studio**

- Download and install [Android Studio](https://developer.android.com/studio).
- During setup, install the **Android SDK** and accept the licenses. This provides the emulator and `adb`.

**2. Create an Android Virtual Device (AVD)**

- In Android Studio: **Tools** → **Device Manager** (or **AVD Manager**).
- Click **Create Device**, choose a device definition (e.g. **Pixel 9 Pro XL**), then choose a system image (e.g. API 35) and finish.
- Note the AVD name (e.g. `Pixel_9_Pro_XL_2`). To list names from the terminal:

```bash
emulator -list-avds
```

**3. Start the emulator**

Start your AVD (use the name from step 2):

```bash
emulator -avd Pixel_9_Pro_XL_2
```

Leave the emulator window open. Wait until the device has fully booted (home screen is visible).

**4. Install the app on the emulator**

In a terminal at the project root:

```bash
npx expo run:android
```

- If multiple devices are connected, choose the emulator when prompted.
- The **first** run can take a long time (Gradle downloads dependencies and builds the native app). Later runs are faster.
- When the build finishes, the app installs and launches on the emulator. You can close the app or leave it; Maestro will launch it when tests run.

**5. Start the Metro bundler**

The development build loads JavaScript from Metro, so Metro must be running when Maestro runs the app.

In a **separate terminal** at the project root, start Metro and leave it running:

```bash
npx expo start
```

Wait until Metro is ready (e.g. "Metro waiting on …" or the QR code is shown). Do not stop this process while running E2E tests.

**6. Run Maestro tests**

In **another terminal** at the project root (with the emulator running and Metro already started):

```bash
maestro test .maestro/
```

Maestro will launch the app on the emulator, run the flows in `.maestro/flows/`, and report results.

**7. Run a single flow**

To run only one flow (e.g. the root screen flow):

```bash
maestro test .maestro/flows/01-root-screen.yaml
```

**8. Run tests on multiple emulators simultaneously**

With three (or more) Android emulators running, you can run the same flows in parallel on all of them. Ensure at least 3 devices are booted (e.g. `adb devices` shows 3), then:

```bash
maestro test --shard-all 3 .maestro/
```

Maestro runs the same tests on each of the 3 devices in parallel. Useful for checking behavior across different API levels or screen sizes; see the Maestro docs for `--shard-split` to distribute different flows across devices instead.

**Ongoing workflow**

- **After JS/React-only changes:** You do **not** need to run `npx expo run:android` again. Keep Metro running and run `maestro test .maestro/` whenever you want to re-run E2E tests.
- **After native/Android or `app.json` changes:** Run `npx expo run:android` again to rebuild and reinstall, then run Metro and Maestro as above.

**Quick run (all-in-one script)**  
From the project root you can run a script that starts the emulator, installs the app, starts Metro, and runs Maestro. By default it uses the **Pixel_9_Pro_XL_2** AVD.

```bash
npm run e2e:android
```

Or run the script directly:

- **Default (all flows, Pixel_9_Pro_XL_2):** `./scripts/e2e-android.sh`
- **Another AVD:** `./scripts/e2e-android.sh --avd MyAVDName`
- **Subset of flows:** `./scripts/e2e-android.sh .maestro/flows/01-root-screen.yaml`
- **Other AVD + subset:** `./scripts/e2e-android.sh --avd MyAVD .maestro/flows/01-root-screen.yaml`

Ensure the AVD exists (e.g. in Android Studio → Device Manager) and that no other instance of that AVD is already running. The script stops Metro and the emulator automatically when the run finishes.


## EAS Build (Android & iOS)

Use [Expo Application Services (EAS)](https://expo.dev) to build installable apps for Android and iOS and share them with testers.

### Setup

1. **Create a free account** at [expo.dev](https://expo.dev) and log in.
2. **Install EAS CLI and log in**:

```bash
npm install -g eas-cli
eas login
```

3. **Configure the project for EAS** (if not already done):

```bash
eas build:configure
```

### Creating builds

**Android (simplest)**  
Produces an APK you can share via a link. No paid account required.

```bash
eas build --profile preview --platform android
```

When the build finishes, EAS gives you a download link (and QR code). Share that link; testers open it on their Android device and install the APK.

**iOS (TestFlight)**  
Requires an [Apple Developer account](https://developer.apple.com/programs/) ($99/year). Build for App Store Connect, then submit so the build appears in TestFlight:

```bash
eas build --profile production --platform ios
```

When the build finishes, submit it to App Store Connect:

```bash
eas submit --platform ios --latest
```

After Apple processes the build (typically 10–30 minutes), it appears in [App Store Connect](https://appstoreconnect.apple.com) → your app → **TestFlight**. Add the build to an internal (or external) tester group; testers install via the TestFlight app on their iPhone or iPad.

### Pushing an update to the build (TestFlight)

To push an update to testers, you create a new build and submit it, then add that build in TestFlight.

**1. Build a new version**

```bash
eas build --profile production --platform ios
```

When prompted:
- **Generate new Apple Distribution Certificate?** → **N** (reuse existing)
- **Generate new Provisioning Profile?** → **N** (reuse existing)

EAS will use the **remote** version source and bump the build number for you. Wait for the build to finish.

**2. Submit to App Store Connect (for TestFlight)**

```bash
eas submit --platform ios --latest
```

When prompted:
- **Generate new App Store Connect API Key?** → **N** (reuse existing)

That uploads the new build to App Store Connect.

**3. Wait for processing**

Give it about 10–30 minutes. When the new build shows **"Ready to Submit"** in App Store Connect (and you get the email), it's ready for TestFlight.

**4. Add the new build in TestFlight**

1. App Store Connect → your app → **TestFlight**.
2. Under **Internal Testing**, open your **group**.
3. Click **Add Builds** (or the **+** next to Builds).
4. Select the **new** build (the one you just submitted).
5. Fill in "What to Test" and add it.

Testers will see the new build in the TestFlight app and can install/update to it.

**Summary:** Code change → `eas build --profile production --platform ios` → `eas submit --platform ios --latest` → wait for processing → add the new build to your TestFlight group. Reuse existing credentials (answer **N** to generating new cert/profile/API key) unless something's broken or expired.

### Build profiles

The project’s `eas.json` defines profiles such as `development`, `preview`, and `production`. The **preview** profile is used for internal testing (e.g. Android APK, iOS ad-hoc via link). The **production** profile is used for iOS TestFlight and App Store builds.

## Project Structure

```
BookMyMark/
├── App.js                    # Main app entry point with navigation
├── assets/                   # Images and static assets
├── src/
│   ├── Classes/              # Data model classes
│   │   ├── BookMark.js
│   │   └── Category.js
│   ├── Components/           # Reusable UI components
│   │   ├── BottomActionBar.js
│   │   ├── DropdownMenu.js
│   │   ├── EllipsisMenuButton.js
│   │   ├── MenuItem.js
│   │   └── SearchBar.js
│   ├── Context/              # React Context for state management
│   │   └── FolderContext.js
│   ├── CSS/                  # Global styles
│   │   └── GlobalCss.js
│   ├── Screens/              # Screen components
│   │   ├── HomeScreen.js
│   │   ├── BookMarkListScreen.js
│   │   └── NewBookMarkScreen.js
│   └── Utils/                # Utility functions and constants
│       └── Constants.js
├── package.json
└── babel.config.js
```

## Tech Stack

- **Expo SDK 54**
- **React Native 0.81.5**
- **React 19.1.0**
- **React Navigation** (Native Stack Navigator)
- **@expo/vector-icons** for icons

## Troubleshooting

### "Function is not a constructor" error
Ensure you're using Node.js >= 20.19.4 (Node v24.4.1 is recommended). Check with `node -v`.

If your terminal shows an older version, switch to Node 24:

```bash
# Load nvm
source ~/.nvm/nvm.sh

# Use Node 24
nvm use 24
```

### Module not found errors
Try deleting `node_modules` and reinstalling:

```bash
rm -rf node_modules
npm install --legacy-peer-deps
```

### Metro bundler issues
Clear the Metro cache:

```bash
npx expo start --clear
```

### Expo Go version mismatch
Make sure your Expo Go app is updated to support SDK 54.

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the Expo development server |
| `npm run ios` | Start and open in iOS simulator |
| `npm run android` | Start and open in Android emulator |
| `npm run web` | Start and open in web browser |
| `npm test` | Run tests with Jest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## License

This project is private and not licensed for public use.
