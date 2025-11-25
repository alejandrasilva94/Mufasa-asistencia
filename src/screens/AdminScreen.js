// src/screens/AdminScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity 
} from 'react-native';
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../theme/colors';
import { fonts } from '../theme/fonts';

export default function AdminScreen() {
  const [asistencias, setAsistencias] = useState([]);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('');
  const [buscarNombre, setBuscarNombre] = useState('');

  useEffect(() => {
    cargarAsistencias();
  }, []);

  const cargarAsistencias = async () => {
    try {
      const data = await AsyncStorage.getItem('@asistencias');
      if (data) setAsistencias(JSON.parse(data));
    } catch (e) {
      console.error(e);
    }
  };

  // Aplicar filtros
  const filtrar = asistencias.filter((a) => {
    const coincideFecha = filtroFecha ? a.fecha.includes(filtroFecha) : true;
    const coincideTurno = filtroTurno ? a.turno === filtroTurno : true;
    const coincideNombre = buscarNombre
      ? a.alumno.toLowerCase().includes(buscarNombre.toLowerCase())
      : true;

    return coincideFecha && coincideTurno && coincideNombre;
  });

  // Cálculos de totales
  const total = filtrar.length;
  const presentes = filtrar.filter((a) => a.presente).length;
  const ausentes = filtrar.filter((a) => !a.presente).length;
  // Exportar a Excel
const exportarExcel = async () => {
  try {
    // 1. Preparar datos
    const datos = filtrar.map(a => ({
      Alumno: a.alumno,
      Fecha: a.fecha,
      Turno: a.turno,
      Estado: a.presente ? "Presente" : "Ausente",
    }));

    // 2. Crear hoja y libro
    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Asistencias");

    // 3. Convertir a base64
    const excelBase64 = XLSX.write(libro, { type: "base64", bookType: "xlsx" });

    // 4. Guardar archivo en el dispositivo (usando API legacy)
    const fileUri = FileSystem.documentDirectory + "asistencias.xlsx";
    await FileSystem.writeAsStringAsync(fileUri, excelBase64, {
      encoding: "base64",
    });

    // 5. Compartir archivo
    await Sharing.shareAsync(fileUri);

  } catch (error) {
    console.log("Error exportando Excel:", error);
  }
};



  return (
    <View style={styles.container}>

      <Text style={styles.title}>Panel de Administración</Text>

      {/* FILTRO FECHA */}
      <TextInput
        placeholder="Buscar por fecha (ej: 10/1/2025)"
        placeholderTextColor="#888"
        value={filtroFecha}
        onChangeText={setFiltroFecha}
        style={styles.input}
      />

      {/* BUSCAR NOMBRE */}
      <TextInput
        placeholder="Buscar alumno"
        placeholderTextColor="#888"
        value={buscarNombre}
        onChangeText={setBuscarNombre}
        style={styles.input}
      />

      {/* FILTRO TURNOS */}
      <View style={styles.turnos}>
        {['mañana', 'siesta', 'tarde'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.turnoBtn,
              filtroTurno === t && styles.turnoActivo
            ]}
            onPress={() => setFiltroTurno(filtroTurno === t ? '' : t)}
          >
            <Text
              style={[
                styles.turnoTexto,
                filtroTurno === t && styles.turnoTextoActivo
              ]}
            >
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ESTADÍSTICAS */}
      <View style={styles.stats}>
        <Text style={styles.statsTxt}>Total: {total}</Text>
        <Text style={[styles.statsTxt, { color: '#4CAF50' }]}>
          Presentes: {presentes}
        </Text>
        <Text style={[styles.statsTxt, { color: '#E05656' }]}>
          Ausentes: {ausentes}
        </Text>
      </View>
      {/* BOTÓN EXPORTAR */}
<TouchableOpacity style={styles.btnExcel} onPress={exportarExcel}>
  <Text style={styles.btnExcelTxt}>Exportar a Excel</Text>
</TouchableOpacity>


      {/* LISTA */}
      <FlatList
        style={{ marginTop: 10 }}
        data={filtrar}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardName}>{item.alumno}</Text>
            <Text style={styles.cardTxt}>Fecha: {item.fecha}</Text>
            <Text style={styles.cardTxt}>Turno: {item.turno}</Text>
            <Text 
              style={[
                styles.cardEstado,
                item.presente ? styles.presente : styles.ausente
              ]}
            >
              {item.presente ? "✔ Presente" : "✖ Ausente"}
            </Text>
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
    padding: 16,
    backgroundColor: colors.lightGray,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    fontFamily: fonts.regular,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  turnos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },

  turnoBtn: {
    backgroundColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 16,
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
    fontFamily: fonts.bold,
    color: '#fff',
  },

  stats: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  statsTxt: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },

  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },

  cardName: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.secondary,
  },
  cardTxt: {
    fontFamily: fonts.regular,
    marginTop: 4,
  },

  cardEstado: {
    marginTop: 8,
    fontFamily: fonts.bold,
    fontSize: 16,
  },

  presente: { color: '#4CAF50' },
  ausente: { color: '#E05656' },

  btnExcel: {
  backgroundColor: colors.secondary,
  paddingVertical: 14,
  borderRadius: 12,
  marginBottom: 10,
},
btnExcelTxt: {
  fontFamily: fonts.bold,
  color: '#fff',
  fontSize: 18,
  textAlign: 'center',
},

});
