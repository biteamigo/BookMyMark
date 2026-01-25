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
│   │   ├── NewBookMarkScreen.js
│   │   └── NewFolderScreen.js
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

## Testing

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

## License

This project is private and not licensed for public use.
