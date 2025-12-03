// src/screens/AdminScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

import colors from "../theme/colors";
import { fonts } from "../theme/fonts";

import { obtenerAsistenciasFirebase } from "../firebase/asistencias";

export default function AdminScreen() {
  const [asistencias, setAsistencias] = useState([]);
  const [filtroFecha, setFiltroFecha] = useState("");      // YYYY-MM-DD o parte
  const [filtroSala, setFiltroSala] = useState("");        // classroomCode, ej: "Sala3M"
  const [buscarNombre, setBuscarNombre] = useState("");    // nombre del alumno
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const lista = await obtenerAsistenciasFirebase();
        setAsistencias(lista);
      } catch (e) {
        console.log("Error cargando asistencias en Admin:", e);
        Alert.alert("Error", "No se pudieron cargar las asistencias.");
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  // 🔎 Aplicar filtros en memoria
  const asistenciasFiltradas = asistencias.filter((a) => {
    const fecha = a.fecha || ""; // string "YYYY-MM-DD"
    const sala = a.classroomCode || "";
    const nombre = (a.studentNombre || "").toLowerCase();

    const coincideFecha = filtroFecha
      ? fecha.includes(filtroFecha)
      : true;

    const coincideSala = filtroSala
      ? sala.toLowerCase().includes(filtroSala.toLowerCase())
      : true;

    const coincideNombre = buscarNombre
      ? nombre.includes(buscarNombre.toLowerCase())
      : true;

    return coincideFecha && coincideSala && coincideNombre;
  });

  // 📊 Totales
  const total = asistenciasFiltradas.length;
  const presentes = asistenciasFiltradas.filter((a) => a.presente).length;
  const ausentes = asistenciasFiltradas.filter((a) => !a.presente).length;

  // 📁 Exportar a Excel
  const exportarExcel = async () => {
  try {
    if (!asistenciasFiltradas.length) {
      Alert.alert("Sin datos", "No hay asistencias para exportar con los filtros actuales.");
      return;
    }

    const datos = asistenciasFiltradas.map((a) => ({
      Alumno: a.studentNombre || "",
      Fecha: a.fecha || "",
      Sala: a.classroomCode || "",
      Estado: a.presente ? "Presente" : "Ausente",
    }));

    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Asistencias");

    const excelBase64 = XLSX.write(libro, {
      type: "base64",
      bookType: "xlsx",
    });

    const fileUri =
      FileSystem.documentDirectory + `asistencias_mufasa.xlsx`;

    // 👇 CLAVE: usar simplemente "base64" como string
    await FileSystem.writeAsStringAsync(fileUri, excelBase64, {
      encoding: "base64",
    });

    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(
        "No disponible",
        "La opción de compartir no está disponible en este dispositivo."
      );
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Exportar asistencias Mufasa",
    });
  } catch (error) {
    console.log("Error exportando Excel:", error);
    Alert.alert("Error", "No se pudo exportar el archivo de Excel.");
  }
};



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8, fontFamily: fonts.regular }}>
          Cargando asistencias...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panel de Administración</Text>

      {/* FILTRO FECHA */}
      <TextInput
        placeholder="Filtrar por fecha (ej: 2025-12-03)"
        placeholderTextColor="#888"
        value={filtroFecha}
        onChangeText={setFiltroFecha}
        style={styles.input}
      />

      {/* FILTRO SALA */}
      <TextInput
        placeholder="Filtrar por sala (ej: Sala3M)"
        placeholderTextColor="#888"
        value={filtroSala}
        onChangeText={setFiltroSala}
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

      {/* ESTADÍSTICAS */}
      <View style={styles.stats}>
        <Text style={styles.statsTxt}>Total: {total}</Text>
        <Text style={[styles.statsTxt, { color: "#4CAF50" }]}>
          Presentes: {presentes}
        </Text>
        <Text style={[styles.statsTxt, { color: "#E05656" }]}>
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
        data={asistenciasFiltradas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardName}>{item.studentNombre}</Text>
            <Text style={styles.cardTxt}>Fecha: {item.fecha}</Text>
            <Text style={styles.cardTxt}>Sala: {item.classroomCode}</Text>
            <Text
              style={[
                styles.cardEstado,
                item.presente ? styles.presente : styles.ausente,
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.secondary,
    textAlign: "center",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    fontFamily: fonts.regular,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  stats: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginVertical: 12,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statsTxt: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
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
  presente: { color: "#4CAF50" },
  ausente: { color: "#E05656" },
  btnExcel: {
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  btnExcelTxt: {
    fontFamily: fonts.bold,
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
});
