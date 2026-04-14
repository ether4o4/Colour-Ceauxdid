import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ChatScreen } from '../screens/ChatScreen';
import { AgentManagerScreen } from '../screens/AgentManagerScreen';
import { StorageViewerScreen } from '../screens/StorageViewerScreen';
import { SystemStatusScreen } from '../screens/SystemStatusScreen';

export type RootStackParamList = {
  Chat: undefined;
  Agents: undefined;
  Storage: undefined;
  Status: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Chat"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#0A0A15' },
        }}
      >
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Agents" component={AgentManagerScreen} />
        <Stack.Screen name="Storage" component={StorageViewerScreen} />
        <Stack.Screen name="Status" component={SystemStatusScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
