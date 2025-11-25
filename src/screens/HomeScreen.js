// src/screens/HomeScreen.js
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import colors from '../theme/colors';
import { fonts } from '../theme/fonts';
import { db } from "../firebase/firebase";


export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Bienvenidas a Mufasa</Text>
      <Text style={styles.subtitle}>Centro de Desarrollo Infantil</Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate('Asistencia')}
      >
        <Text style={styles.btnText}>Registrar Asistencias</Text>
      </TouchableOpacity>
      <TouchableOpacity
  style={styles.btn}
  onPress={() => navigation.navigate('Admin')}
>
  <Text style={styles.btnText}>Panel del Administrador</Text>
</TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textDark,
    marginTop: 8,
    marginBottom: 30,
  },

  // Nuevo botón:
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  btnText: {
    fontFamily: fonts.bold,
    color: '#fff',
    fontSize: 16,
  },
});
