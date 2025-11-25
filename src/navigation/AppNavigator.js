// src/navigation/AppNavigator.js
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AsistenciaScreen from '../screens/AsistenciaScreen';
import AdminScreen from '../screens/AdminScreen';

import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { View, ActivityIndicator } from 'react-native';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Detectar si hay sesión activa
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {/* Si NO hay usuario → mostrar Login */}
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            {/* Si hay usuario → navegación interna */}
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Asistencia" component={AsistenciaScreen} />
            <Stack.Screen 
              name="Admin" 
              component={AdminScreen} 
              options={{ headerShown: true, title: "Administrador" }}
            />
          </>
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
}
