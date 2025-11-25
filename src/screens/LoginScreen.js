// src/screens/LoginScreen.js
import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator 
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";
import colors from "../theme/colors";
import { fonts } from "../theme/fonts";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async () => {
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const login = async () => {
  setLoading(true);
  setError("");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // No navegamos desde aquí 😎
  } catch (err) {
    setError("Credenciales incorrectas.");
  }

  setLoading(false);
};

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
        style={styles.input}
      />

      <TextInput
        placeholder="Contraseña"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.btn} onPress={login}>
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
