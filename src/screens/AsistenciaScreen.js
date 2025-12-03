// src/screens/AsistenciaScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";

import colors from "../theme/colors";
import { fonts } from "../theme/fonts";

import { auth, db } from "../firebase/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { guardarAsistenciaFirebase } from "../firebase/asistencias";

export default function AsistenciaScreen() {
  const [classroomCode, setClassroomCode] = useState(null); // Sala actual del docente
  const [students, setStudents] = useState([]); // Alumnos de esa sala
  const [asistenciasHoy, setAsistenciasHoy] = useState([]);
  const [loading, setLoading] = useState(true);

  const fechaHoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // 1) Cargar sala(s) del usuario y alumnos de esa sala
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          Alert.alert("Error", "No hay usuario autenticado.");
          setLoading(false);
          return;
        }

        // Leer /users/{uid} para saber qué classroom(s) tiene
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          Alert.alert(
            "Atención",
            "Este usuario no tiene sala asignada en la base de datos."
          );
          setLoading(false);
          return;
        }

        const userData = userSnap.data();
        const classrooms = userData.classrooms || [];

        if (!classrooms.length) {
          Alert.alert(
            "Atención",
            "Este usuario no tiene ninguna sala asignada."
          );
          setLoading(false);
          return;
        }

        // Por ahora tomamos la primera sala asignada
        const salaPrincipal = classrooms[0];
        setClassroomCode(salaPrincipal);

        // Cargar alumnos de esa sala
        await cargarAlumnosDeSala(salaPrincipal);
      } catch (err) {
        console.log("Error cargando datos iniciales:", err);
        Alert.alert("Error", "No se pudo cargar la información.");
      } finally {
        setLoading(false);
      }
    };

    cargarDatosIniciales();
  }, []);

  const cargarAlumnosDeSala = async (code) => {
    try {
      const q = query(
        collection(db, "students"),
        where("classroomCode", "==", code),
        where("active", "==", true)
      );

      const snap = await getDocs(q);
      const lista = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setStudents(lista);
    } catch (err) {
      console.log("Error cargando alumnos:", err);
      Alert.alert("Error", "No se pudieron cargar los alumnos.");
    }
  };

  // 2) Función para registrar asistencia de un alumno
  const registrarAsistencia = async (student, presente) => {
    const asistencia = {
      studentId: student.id,
      studentNombre: `${student.firstName} ${student.lastName}`,
      classroomCode: student.classroomCode,
      presente,
      fecha: fechaHoy,
    };

    try {
      await guardarAsistenciaFirebase(asistencia);

      // Agregar a la lista local de asistencias de hoy para mostrar en la pantalla
      setAsistenciasHoy((prev) => [
        {
          id: `${student.id}_${Date.now()}`,
          ...asistencia,
        },
        ...prev,
      ]);

      Alert.alert(
        "Registrado",
        `${asistencia.studentNombre} marcado como ${
          presente ? "PRESENTE" : "AUSENTE"
        }`
      );
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo guardar la asistencia.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8, fontFamily: fonts.regular }}>
          Cargando datos...
        </Text>
      </View>
    );
  }

  if (!classroomCode) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 16 }}>
          No hay sala asignada a este usuario.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registro de Asistencia</Text>
      <Text style={styles.subtitle}>
        Sala: <Text style={styles.subtitleSala}>{classroomCode}</Text>
      </Text>
      <Text style={styles.subtitle}>Fecha: {fechaHoy}</Text>

      {/* Lista de alumnos */}
      <Text style={styles.sectionTitle}>Alumnos</Text>
      {students.length === 0 ? (
        <Text style={styles.noData}>
          No hay alumnos cargados para esta sala.
        </Text>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          style={{ marginTop: 8 }}
          renderItem={({ item }) => (
            <View style={styles.studentCard}>
              <Text style={styles.studentName}>
                {item.firstName} {item.lastName}
              </Text>
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={[styles.estadoBtn, styles.btnPresente]}
                  onPress={() => registrarAsistencia(item, true)}
                >
                  <Text style={styles.estadoTxt}>Presente</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.estadoBtn, styles.btnAusente]}
                  onPress={() => registrarAsistencia(item, false)}
                >
                  <Text style={styles.estadoTxt}>Ausente</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Asistencias registradas hoy (solo vista rápida local) */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
        Asistencias registradas hoy
      </Text>
      {asistenciasHoy.length === 0 ? (
        <Text style={styles.noData}>
          Todavía no se registró ninguna asistencia.
        </Text>
      ) : (
        <FlatList
          data={asistenciasHoy}
          keyExtractor={(item) => item.id}
          style={{ marginTop: 8 }}
          renderItem={({ item }) => (
            <View style={styles.asistenciaCard}>
              <Text style={styles.asistenciaNombre}>{item.studentNombre}</Text>
              <Text style={styles.asistenciaDetalle}>
                Sala: {item.classroomCode} •{" "}
                {item.presente ? "✔ Presente" : "✖ Ausente"}
              </Text>
            </View>
          )}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.secondary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: "center",
    color: colors.textDark,
  },
  subtitleSala: {
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.secondary,
    marginTop: 16,
    marginBottom: 6,
  },
  noData: {
    fontFamily: fonts.regular,
    color: colors.textDark,
    fontStyle: "italic",
  },
  studentCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  studentName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.secondary,
    marginBottom: 8,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  estadoBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 4,
  },
  btnPresente: {
    backgroundColor: "#4CAF50",
  },
  btnAusente: {
    backgroundColor: "#E05656",
  },
  estadoTxt: {
    fontFamily: fonts.bold,
    color: "#fff",
  },
  asistenciaCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  asistenciaNombre: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.secondary,
  },
  asistenciaDetalle: {
    fontFamily: fonts.regular,
    color: colors.textDark,
    marginTop: 2,
  },
});
