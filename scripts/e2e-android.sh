#!/usr/bin/env bash
# Run E2E tests on Android: start emulator, install app, start Metro, run Maestro.
# Usage:
#   ./scripts/e2e-android.sh
#   ./scripts/e2e-android.sh --avd Pixel_9_Pro_XL_2
#   ./scripts/e2e-android.sh .maestro/flows/01-root-screen.yaml
#   ./scripts/e2e-android.sh --avd MyAVD .maestro/flows/01-root-screen.yaml

set -e

# Project root (directory containing package.json)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# Default AVD
DEFAULT_AVD="Pixel_9_Pro_XL_2"
AVD_NAME="$DEFAULT_AVD"
FLOWS=()

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --avd)
      AVD_NAME="$2"
      shift 2
      ;;
    *)
      FLOWS+=("$1")
      shift
      ;;
  esac
done

echo "=== E2E Android: AVD=$AVD_NAME, flows=${FLOWS[*]:-.maestro/} ==="

# Clean up Metro and emulator on exit (success or failure)
cleanup() {
  echo "Stopping Metro and emulator..."
  [[ -n "$METRO_PID" ]] && kill "$METRO_PID" 2>/dev/null || true
  # Use SIGKILL so the emulator exits immediately (avoids 20s graceful shutdown)
  [[ -n "$EMULATOR_PID" ]] && kill -9 "$EMULATOR_PID" 2>/dev/null || true
}
trap cleanup EXIT

# 1. Start emulator
echo "[1/4] Starting emulator ($AVD_NAME)..."
emulator -avd "$AVD_NAME" &
EMULATOR_PID=$!
# Give it a moment to begin booting
sleep 3

# Wait for device to be ready
echo "      Waiting for device..."
adb wait-for-device
while [[ $(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r') != "1" ]]; do
  sleep 2
done
echo "      Emulator booted."

# 2. Install app (build and install, no Metro)
echo "[2/4] Building and installing app..."
npx expo run:android --no-bundler

# 3. Start Metro in background
echo "[3/4] Starting Metro bundler..."
npx expo start &
METRO_PID=$!
# Wait for Metro to be ready
sleep 15
echo "      Metro should be ready."

# 4. Run Maestro tests (step-by-step in terminal + HTML report)
# Run Maestro under script(1) with a pseudo-TTY; send its output to /dev/tty so it appears
# on your terminal even when this script is run via npm run e2e:android (npm may connect
# stdout to a pipe, which hides the step-by-step output).
REPORT_DIR=".maestro/output"
REPORT_FILE="$REPORT_DIR/report.html"
mkdir -p "$REPORT_DIR"
echo "[4/4] Running Maestro tests (report → $REPORT_FILE)..."
MAESTRO_EXIT=0
if [[ ${#FLOWS[@]} -gt 0 ]]; then
  script -q /dev/null maestro test --format html --output "$REPORT_FILE" "${FLOWS[@]}" > /dev/tty 2>&1 || MAESTRO_EXIT=$?
else
  script -q /dev/null maestro test --format html --output "$REPORT_FILE" .maestro/ > /dev/tty 2>&1 || MAESTRO_EXIT=$?
fi

echo "=== E2E run finished. ==="
echo "HTML report: $REPORT_FILE"
exit $MAESTRO_EXIT
