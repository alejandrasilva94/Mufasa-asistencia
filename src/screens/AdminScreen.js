// src/screens/AdminScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

import colors from "../theme/colors";
import { fonts } from "../theme/fonts";

import { obtenerAsistenciasFirebase } from "../firebase/asistencias";

export default function AdminScreen() {
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroFecha, setFiltroFecha] = useState("");    // ej: 2025-12-06
  const [filtroTurno, setFiltroTurno] = useState("");    // "mañana" | "siesta" | "tarde"
  const [buscarNombre, setBuscarNombre] = useState("");  // parte del nombre
  const [filtroSala, setFiltroSala] = useState("");      // classroomCode opcional

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const data = await obtenerAsistenciasFirebase();
        setAsistencias(data);
      } catch (error) {
        console.log("Error cargando asistencias (Admin):", error);
        Alert.alert("Error", "No se pudieron cargar las asistencias.");
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  //
  // Filtros
  //
  const asistenciasFiltradas = asistencias.filter((a) => {
    const fechaOk = filtroFecha ? (a.fecha || "").includes(filtroFecha) : true;
    const turnoOk = filtroTurno ? a.turno === filtroTurno : true;
    const nombreOk = buscarNombre
      ? (a.studentNombre || "")
          .toLowerCase()
          .includes(buscarNombre.toLowerCase())
      : true;
    const salaOk = filtroSala
      ? (a.classroomCode || "")
          .toLowerCase()
          .includes(filtroSala.toLowerCase())
      : true;

    return fechaOk && turnoOk && nombreOk && salaOk;
  });

  //
  // Stats
  //
  const total = asistenciasFiltradas.length;
  const presentes = asistenciasFiltradas.filter((a) => a.presente).length;
  const ausentes = asistenciasFiltradas.filter((a) => a.presente === false)
    .length;

  //
  // Exportar a Excel
  //
  const exportarExcel = async () => {
    try {
      if (!asistenciasFiltradas.length) {
        Alert.alert(
          "Sin datos",
          "No hay asistencias para exportar con los filtros actuales."
        );
        return;
      }

      // 1. Preparar datos
      const datos = asistenciasFiltradas.map((a) => ({
        Alumno: a.studentNombre || "",
        Fecha: a.fecha || "",
        Sala: a.classroomCode || "",
        Turno: a.turno || "",
        Estado: a.presente ? "Presente" : "Ausente",
        "Hora entrada": a.horaEntrada || "",
        "Hora salida": a.horaSalida || "",
      }));

      // 2. Crear hoja y libro
      const hoja = XLSX.utils.json_to_sheet(datos);
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Asistencias");

      // 3. Convertir a base64
      const excelBase64 = XLSX.write(libro, {
        type: "base64",
        bookType: "xlsx",
      });

      // 4. Guardar archivo
      const fileUri =
        FileSystem.documentDirectory + "asistencias_mufasa.xlsx";

      await FileSystem.writeAsStringAsync(fileUri, excelBase64, {
        encoding: "base64",
      });

      // 5. Compartir
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
      Alert.alert(
        "Error",
        "No se pudo exportar el archivo de Excel. Intentá nuevamente."
      );
    }
  };

  //
  // Render
  //
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

      {/* FILTROS */}
      <TextInput
        placeholder="Filtrar por fecha (ej: 2025-12-06 o 2025-12)"
        placeholderTextColor="#888"
        value={filtroFecha}
        onChangeText={setFiltroFecha}
        style={styles.input}
      />

      <TextInput
        placeholder="Buscar por alumno"
        placeholderTextColor="#888"
        value={buscarNombre}
        onChangeText={setBuscarNombre}
        style={styles.input}
      />

      <TextInput
        placeholder="Filtrar por sala (ej: Sala1M)"
        placeholderTextColor="#888"
        value={filtroSala}
        onChangeText={setFiltroSala}
        style={styles.input}
      />

      {/* FILTRO DE TURNOS */}
      <View style={styles.turnos}>
        {["mañana", "siesta", "tarde"].map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.turnoBtn,
              filtroTurno === t && styles.turnoActivo,
            ]}
            onPress={() => setFiltroTurno(filtroTurno === t ? "" : t)}
          >
            <Text
              style={[
                styles.turnoTexto,
                filtroTurno === t && styles.turnoTextoActivo,
              ]}
            >
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* STATS */}
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
            <Text style={styles.cardTxt}>Turno: {item.turno}</Text>
            <Text style={styles.cardTxt}>
              Entrada: {item.horaEntrada || "-"} | Salida:{" "}
              {item.horaSalida || "-"}
            </Text>
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
  turnos: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  turnoBtn: {
    backgroundColor: "#eee",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
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
    color: "#fff",
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
