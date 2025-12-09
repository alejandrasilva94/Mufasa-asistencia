// src/screens/HomeScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import colors from "../theme/colors";
import { fonts } from "../theme/fonts";

import { auth, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";   // 👈 NUEVO

export default function HomeScreen({ navigation }) {
  const [role, setRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const cargarRol = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setRole(null);
          setLoadingRole(false);
          return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const snap = await getDoc(userDocRef);

        if (snap.exists()) {
          const data = snap.data();
          setRole(data.role || "teacher");
        } else {
          setRole("teacher");
        }
      } catch (err) {
        console.log("Error cargando rol en HomeScreen:", err);
        setRole("teacher");
      }
      setLoadingRole(false);
    };

    cargarRol();
  }, []);

  const handleLogout = async () => {       // 👈 NUEVO
    try {
      await signOut(auth);
      // onAuthStateChanged en AppNavigator va a detectar que no hay usuario
      // y te va a mandar automáticamente a la pantalla de Login
    } catch (err) {
      console.log("Error al cerrar sesión:", err);
    }
  };

  if (loadingRole) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Bienvenidos a Mufasa</Text>
      <Text style={styles.subtitle}>Centro de Desarrollo Infantil</Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate("Asistencia")}
      >
        <Text style={styles.btnText}>Registrar Asistencias</Text>
      </TouchableOpacity>

      {role === "admin" && (
        <TouchableOpacity
          style={[styles.btn, { marginTop: 12 }]}
          onPress={() => navigation.navigate("Admin")}
        >
          <Text style={styles.btnText}>Panel del Administrador</Text>
        </TouchableOpacity>
      )}

      {/* 👇 BOTÓN CERRAR SESIÓN */}
      <TouchableOpacity
        style={[styles.btnLogout, { marginTop: 20 }]}
        onPress={handleLogout}
      >
        <Text style={styles.btnLogoutTxt}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 24,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.secondary,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textDark,
    marginTop: 8,
    marginBottom: 30,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 10,
    marginTop: 8,
  },
  btnText: {
    fontFamily: fonts.bold,
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  btnLogout: {                          // 👈 NUEVO
    backgroundColor: "#999",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  btnLogoutTxt: {                       // 👈 NUEVO
    fontFamily: fonts.bold,
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },
});
