// src/screens/LoginScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons"; // ✅ Íconos para Expo
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";
import colors from "../theme/colors";
import { fonts } from "../theme/fonts";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👁️
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      if (!email || !password) {
        setError("Completa email y contraseña.");
        setLoading(false);
        return;
      }

      await signInWithEmailAndPassword(auth, email.trim(), password);
      // AppNavigator escucha onAuthStateChanged y muestra Home/Admin.
    } catch (err) {
      console.log(err);
      setError("Credenciales incorrectas. Revisá tu email y contraseña.");
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      {/* Input + botón para mostrar/ocultar contraseña */}
      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Contraseña"
          placeholderTextColor="#aaa"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          style={styles.inputPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <MaterialCommunityIcons
            name={showPassword ? "eye-off" : "eye"}
            size={24}
            color="#666"
          />
        </TouchableOpacity>
      </View>

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Ingresar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGray,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 26,
    textAlign: "center",
    color: colors.secondary,
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    fontFamily: fonts.regular,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
  },
  inputPassword: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: fonts.regular,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnText: {
    fontFamily: fonts.bold,
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
  },
  error: {
    color: "#E05656",
    fontFamily: fonts.bold,
    marginBottom: 10,
    textAlign: "center",
  },
});
