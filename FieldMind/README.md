# FieldMind v3 🏗️

**Offline-First AI Field Assistant for Construction Sites**

An intelligent mobile application that enables construction workers to capture issues, look up specifications, and share data locally - all without internet connectivity.

## 📱 Download APK

**[⬇️ Download FieldMind APK](./FieldMind-release.apk)** (32 MB)

> Click the link above, then click "Download raw file" to get the APK.

## ✨ Features

### 🎤 Voice-Powered Issue Capture
- Use your device's keyboard voice-to-text to describe issues naturally
- AI automatically enhances and structures your descriptions
- Supports multiple languages with automatic translation

### 📸 Vision AI Photo Analysis
- Take photos of construction issues
- AI analyzes images and auto-fills issue details (type, severity, location)
- Identifies structural, electrical, plumbing, HVAC, and safety issues

### 📚 RAG-Powered Spec Lookup
- Ask questions about specifications in natural language
- AI searches through local document corpus
- Get answers translated to your preferred language

### 📡 P2P Local Sharing (WiFi Direct)
- Share captured issues with nearby devices without internet
- Create local groups for team collaboration
- Sync data across multiple Android devices

### 🌐 Multilingual Support
- English, Spanish, Chinese, Hindi, Arabic, Portuguese, Russian, Japanese, French, German
- Workers interact in their native language
- Internal processing and storage in English

## 🚀 Getting Started

### Prerequisites
- Android device (arm64-v8a architecture)
- Android 8.0 or higher
- ~500MB free storage for AI models

### Installation
1. Download the APK from the link above
2. Enable "Install from unknown sources" in Android settings
3. Open the APK file to install
4. Grant required permissions (camera, microphone, location for P2P)

### First Launch
1. The app will download AI models on first use (~400MB)
2. Wait for models to initialize (shown on home screen)
3. Start capturing issues or querying specs!

## 🛠️ Development

### Tech Stack
- **React Native 0.81** - Cross-platform mobile framework
- **cactus-react-native** - On-device AI inference (LLM, Vision, RAG)
- **op-sqlite** - Local SQLite database
- **react-native-wifi-p2p** - WiFi Direct for P2P sharing
- **React Navigation** - Screen navigation

### Build from Source

```bash
# Clone the repository
git clone https://github.com/ArunaganesanSwaminworker/cactus-react-native.git
cd cactus-react-native/FieldMind

# Install dependencies
npm install

# Start Metro bundler
npm start

# Build and run on Android
npm run android

# Build release APK
cd android && ./gradlew assembleRelease
```

### Project Structure
```
FieldMind/
├── src/
│   ├── screens/          # App screens (Home, Capture, Query, Issues, etc.)
│   ├── services/         # Core services (Database, P2P, Vision, etc.)
│   ├── config/           # Theme and constants
│   ├── models/           # Data models
│   └── utils/            # Utility functions
├── android/              # Android native code
└── ios/                  # iOS native code (not yet configured)
```

## 📋 Permissions Required

| Permission | Purpose |
|------------|---------|
| Camera | Capture photos of issues |
| Microphone | Voice input via keyboard |
| Storage | Save photos and database |
| Location | WiFi Direct P2P discovery |
| Nearby Devices | P2P communication |

## 🔒 Privacy & Offline

- **100% Offline**: All AI processing happens on-device
- **No Cloud Required**: Data never leaves your device unless you share via P2P
- **Local Storage**: Issues and photos stored in local SQLite database

## 📄 License

This project is part of the cactus-react-native ecosystem.

---

Built with ❤️ for construction workers worldwide
