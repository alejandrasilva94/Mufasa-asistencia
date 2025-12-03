// src/navigation/AppNavigator.js
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import AsistenciaScreen from "../screens/AsistenciaScreen";
import AdminScreen from "../screens/AdminScreen";

import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(null);     // usuario Firebase Auth
  const [role, setRole] = useState(null);     // "admin" | "teacher" | null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (usuario) {
        setUser(usuario);

        try {
          // Buscamos el rol en Firestore: /users/{uid}
          const userDocRef = doc(db, "users", usuario.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            const data = snap.data();
            setRole(data.role || "teacher");
          } else {
            // Si no tiene documento en /users, lo tratamos como "teacher" por defecto
            setRole("teacher");
          }
        } catch (err) {
          console.log("Error obteniendo rol del usuario:", err);
          setRole("teacher");
        }
      } else {
        setUser(null);
        setRole(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Si NO hay usuario → solo Login */}
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : role === "admin" ? (
          // 👉 Navegación para ADMIN
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Asistencia" component={AsistenciaScreen} />
            <Stack.Screen
              name="Admin"
              component={AdminScreen}
              options={{ headerShown: true, title: "Administrador" }}
            />
          </>
        ) : (
          // 👉 Navegación para MAESTRA (sin pantalla Admin)
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Asistencia" component={AsistenciaScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
