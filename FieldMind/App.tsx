import 'react-native-get-random-values'; // Must be first import for uuid
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LanguageProvider } from './src/hooks/useLanguage';

import HomeScreen from './src/screens/HomeScreen';
import QueryScreen from './src/screens/QueryScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import IssuesScreen from './src/screens/IssuesScreen';
import IssueDetailScreen from './src/screens/IssueDetailScreen';
import SharingScreen from './src/screens/SharingScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import { theme } from './src/config/theme';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <NavigationContainer>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Query" component={QueryScreen} />
              <Stack.Screen name="Capture" component={CaptureScreen} />
              <Stack.Screen name="Issues" component={IssuesScreen} />
              <Stack.Screen name="IssueDetail" component={IssueDetailScreen} />
              <Stack.Screen name="Sharing" component={SharingScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
