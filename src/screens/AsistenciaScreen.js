// src/screens/AsistenciaScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, FlatList, 
  TouchableOpacity, StyleSheet, Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../theme/colors';
import { fonts } from '../theme/fonts';
import { guardarAsistenciaFirebase } from "../firebase/asistencias";
import { auth } from "../firebase/firebase";

export default function AsistenciaScreen() {
  const [turno, setTurno] = useState('mañana');
  const [nombre, setNombre] = useState('');
  const [presente, setPresente] = useState(true);
  const [asistencias, setAsistencias] = useState([]);

  const hoy = new Date().toLocaleDateString();

  useEffect(() => {
    cargarAsistencias();
  }, []);

  const guardarAsistencias = async (lista) => {
    try {
      await AsyncStorage.setItem('@asistencias', JSON.stringify(lista));
    } catch (e) {
      console.error(e);
    }
  };

  const cargarAsistencias = async () => {
    try {
      const data = await AsyncStorage.getItem('@asistencias');
      if (data) setAsistencias(JSON.parse(data));
    } catch (e) {
      console.error(e);
    }
  };

  const agregarAsistencia = async () => {
  if (!nombre.trim()) return;

  const nueva = {
    alumno: nombre,
    turno,
    presente,
    fecha: hoy,
  };

  try {
    // 🚀 GUARDAR EN FIREBASE
    await guardarAsistenciaFirebase(nueva);

    // 🚀 GUARDAR LOCAL (para mostrar en pantalla)
    const nuevaLocal = {
      id: Date.now().toString(),
      ...nueva,
    };

    const listaNueva = [nuevaLocal, ...asistencias];
    setAsistencias(listaNueva);
    guardarAsistencias(listaNueva);

    setNombre("");
    setPresente(true);

    Alert.alert("Éxito", "Asistencia guardada en Firebase 🎉");

  } catch (error) {
    Alert.alert("Error", "No se pudo guardar la asistencia.");
    console.log(error);
  }
;

    const listaNueva = [nueva, ...asistencias];
    setAsistencias(listaNueva);
    guardarAsistencias(listaNueva);

    setNombre('');
    setPresente(true);
  };

  const eliminarAsistencia = (id) => {
    Alert.alert(
      'Eliminar',
      '¿Deseas eliminar este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => {
            const nuevaLista = asistencias.filter(a => a.id !== id);
            setAsistencias(nuevaLista);
            guardarAsistencias(nuevaLista);
          }
        }
      ]
    );
  };

  const togglePresente = (id) => {
    const nuevaLista = asistencias.map(a => 
      a.id === id ? { ...a, presente: !a.presente } : a
    );
    setAsistencias(nuevaLista);
    guardarAsistencias(nuevaLista);
  };

  const asistenciasHoy = asistencias.filter(a => a.fecha === hoy);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registro de Asistencia</Text>

      {/* TURNOS */}
      <View style={styles.turnos}>
        {['mañana', 'siesta', 'tarde'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.turnoBtn, turno === t && styles.turnoActivo]}
            onPress={() => setTurno(t)}
          >
            <Text
              style={[styles.turnoTexto, turno === t && styles.turnoTextoActivo]}
            >
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* INPUT DEL ALUMNO */}
      <TextInput
        placeholder="Nombre del alumno"
        value={nombre}
        onChangeText={setNombre}
        style={styles.input}
        placeholderTextColor="#999"
      />

      {/* PRESENTE / AUSENTE */}
      <View style={styles.estadoRow}>
        <TouchableOpacity 
          style={[styles.estadoBtn, presente && styles.presenteActivo]}
          onPress={() => setPresente(true)}
        >
          <Text style={[styles.estadoTexto, presente && styles.estadoTextoActivo]}>
            Presente
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.estadoBtn, !presente && styles.ausenteActivo]}
          onPress={() => setPresente(false)}
        >
          <Text style={[styles.estadoTexto, !presente && styles.estadoTextoActivo]}>
            Ausente
          </Text>
        </TouchableOpacity>
      </View>

      {/* BOTÓN AGREGAR */}
      <TouchableOpacity style={styles.btnAgregar} onPress={agregarAsistencia}>
        <Text style={styles.btnAgregarTxt}>Agregar</Text>
      </TouchableOpacity>

      {/* LISTA */}
      <FlatList
        data={asistenciasHoy}
        style={{ marginTop: 16 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => togglePresente(item.id)}>
              <Text style={styles.cardTitle}>
                {item.alumno}
              </Text>
              <Text style={styles.cardSubtitle}>
                Turno: {item.turno}  
              </Text>
              <Text style={[
                styles.cardEstado,
                item.presente ? styles.cardPresente : styles.cardAusente
              ]}>
                {item.presente ? "✔ Presente" : "✖ Ausente"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => eliminarAsistencia(item.id)}>
              <Text style={styles.delete}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

//
// 🎨 ESTILOS
//
const styles = StyleSheet.create({
  container: { 
    flex: 1,
    padding: 18,
    backgroundColor: colors.lightGray,
  },

  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },

  turnos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  turnoBtn: {
    backgroundColor: '#f2f2f2',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },

  turnoActivo: {
    backgroundColor: colors.primary,
  },

  turnoTexto: { 
    fontFamily: fonts.regular,
    color: colors.textDark,
  },

  turnoTextoActivo: { 
    color: '#fff',
    fontFamily: fonts.bold,
  },

  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  estadoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  estadoBtn: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
  },

  presenteActivo: { backgroundColor: '#4CAF50' },
  ausenteActivo: { backgroundColor: '#E05656' },

  estadoTexto: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textDark,
  },

  estadoTextoActivo: {
    color: '#fff',
    fontFamily: fonts.bold,
  },

  btnAgregar: {
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 14,
  },

  btnAgregarTxt: {
    textAlign: 'center',
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: 18,
  },

  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.secondary,
  },

  cardSubtitle: {
    fontFamily: fonts.regular,
    color: colors.textDark,
    marginTop: 4,
  },

  cardEstado: {
    marginTop: 8,
    fontFamily: fonts.bold,
  },

  cardPresente: { color: '#4CAF50' },
  cardAusente: { color: '#E05656' },

  delete: {
    marginTop: 10,
    color: '#D9534F',
    textAlign: 'right',
    fontFamily: fonts.bold,
  },
});
