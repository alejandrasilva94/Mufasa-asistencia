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

import { Picker } from "@react-native-picker/picker";
import { guardarAsistenciasTurnoFirebase } from "../firebase/asistencias";

import colors from "../theme/colors";
import { fonts } from "../theme/fonts";

import { auth, db } from "../firebase/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

// 🕒 Horarios disponibles por turno (saltos de 30 min)
const TURNOS_HORARIOS = {
  mañana: [
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
  ],
  siesta: [
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
  ],
  tarde: [
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
  ],
};

export default function AsistenciaScreen() {
  const [classroomCode, setClassroomCode] = useState(null); // Sala actualmente seleccionada (code)
  const [classroomsList, setClassroomsList] = useState([]); // Códigos de las salas asignadas al usuario
  const [classroomDefinitions, setClassroomDefinitions] = useState([]); // Definiciones de salas (code + name, desde colección classrooms)

  const [students, setStudents] = useState([]); // Alumnos de la sala seleccionada
  const [loading, setLoading] = useState(true);

  const [turno, setTurno] = useState("mañana"); // Turno seleccionado

  // Estado local de asistencia para ESTE día + ESTE turno + ESTA sala
  // { studentId: { presente: true/false/null, horaEntrada: string, horaSalida: string } }
  const [asistenciaTurno, setAsistenciaTurno] = useState({});

  const [saving, setSaving] = useState(false); // estado mientras guarda en Firebase

  const fechaHoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  //
  // Helper: mapea el code técnico a un nombre legible
  //
  const getSalaLabel = (code) => {
    if (!code) return "-";
    const sala = classroomDefinitions.find((c) => c.code === code);
    return sala?.name || code;
  };

  //
  // Cargar definiciones de salas (colección "classrooms")
  //
  const cargarClassroomsDef = async () => {
    try {
      const snap = await getDocs(collection(db, "classrooms"));
      const lista = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setClassroomDefinitions(lista);
    } catch (err) {
      console.log("Error cargando classrooms:", err);
    }
  };

  //
  // 1) Cargar sala(s) del usuario y alumnos de esa sala
  //
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          Alert.alert("Error", "No hay usuario autenticado.");
          setLoading(false);
          return;
        }

        // Cargar definiciones de todas las salas (para mostrar el name)
        await cargarClassroomsDef();

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

        // Guardamos la lista de salas (códigos)
        setClassroomsList(classrooms);

        // Por defecto, tomamos la primera sala asignada
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

  //
  // 2) Cargar alumnos de la sala
  //
  const cargarAlumnosDeSala = async (code) => {
    try {
      const qAlumnos = query(
        collection(db, "students"),
        where("classroomCode", "==", code),
        where("active", "==", true)
      );

      const snap = await getDocs(qAlumnos);
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

  //
  // 3) Cuando cambian alumnos, sala o turno → inicializamos estado
  //    y cargamos asistencias previas (si existen) para hoy.
  //
  useEffect(() => {
    const cargarEstadoAsistencia = async () => {
      // Estado base: todos sin marcar
      const base = {};
      students.forEach((s) => {
        base[s.id] = {
          presente: null,
          horaEntrada: "",
          horaSalida: "",
        };
      });

      // Si aún no hay sala o alumnos, solo ponemos el base y salimos
      if (!classroomCode || students.length === 0) {
        setAsistenciaTurno(base);
        return;
      }

      try {
        // Buscar asistencias ya guardadas para HOY + turno + sala
        const qAsist = query(
          collection(db, "asistencias"),
          where("fecha", "==", fechaHoy),
          where("turno", "==", turno),
          where("classroomCode", "==", classroomCode)
        );

        const snap = await getDocs(qAsist);
        const mapaAsistencias = {};

        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.studentId) return;

          mapaAsistencias[data.studentId] = {
            presente: data.presente ?? null,
            horaEntrada: data.horaEntrada || "",
            horaSalida: data.horaSalida || "",
          };
        });

        // Combinar base + asistencias previas
        const combinado = { ...base };
        Object.entries(mapaAsistencias).forEach(([studentId, datos]) => {
          if (combinado[studentId]) {
            combinado[studentId] = {
              ...combinado[studentId],
              ...datos,
            };
          }
        });

        setAsistenciaTurno(combinado);
      } catch (err) {
        console.log("Error cargando asistencias previas:", err);
        // Si falla la carga, al menos dejamos el base
        setAsistenciaTurno(base);
      }
    };

    cargarEstadoAsistencia();
  }, [students, turno, classroomCode, fechaHoy]);

  //
  // 4) Cambiar de sala
  //
  const cambiarSala = async (nuevaSala) => {
    try {
      setClassroomCode(nuevaSala);
      await cargarAlumnosDeSala(nuevaSala);
    } catch (error) {
      console.log("Error al cambiar de sala:", error);
      Alert.alert("Error", "No se pudo cambiar de sala.");
    }
  };

  //
  // 5) Handlers para marcar presente/ausente y horas
  //
  const marcarPresenteAusente = (studentId, presente) => {
    setAsistenciaTurno((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        presente,
        // si pasa a ausente, limpiamos horas
        horaEntrada: presente ? prev[studentId]?.horaEntrada || "" : "",
        horaSalida: presente ? prev[studentId]?.horaSalida || "" : "",
      },
    }));
  };

  const cambiarHora = (studentId, campo, valor) => {
    // campo: "horaEntrada" | "horaSalida"
    setAsistenciaTurno((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [campo]: valor,
      },
    }));
  };

  //
  // 6) Botón "Guardar cambios" → guarda en Firebase
  //
  const guardarCambios = async () => {
    const registros = Object.entries(asistenciaTurno).filter(
      ([_, data]) => data.presente !== null // sólo los alumnos que la seño tocó
    );

    if (!registros.length) {
      Alert.alert("Sin cambios", "No marcaste ningún alumno todavía.");
      return;
    }

    // Validar que si está presente tenga al menos horaEntrada
    const faltanHoras = registros.some(([_, data]) => {
      return data.presente === true && !data.horaEntrada;
    });

    if (faltanHoras) {
      Alert.alert(
        "Faltan datos",
        "Hay alumnos marcados como presentes sin hora de entrada. Por favor completá al menos la hora de entrada."
      );
      return;
    }

    // Transformar en estructura lista para guardar en Firestore
    const payload = registros.map(([studentId, data]) => {
      const alumno = students.find((s) => s.id === studentId);
      return {
        studentId,
        studentNombre: alumno
          ? `${alumno.firstName} ${alumno.lastName}`
          : "Sin nombre",
        classroomCode: alumno?.classroomCode || classroomCode || "",
        fecha: fechaHoy,
        turno, // "mañana" | "siesta" | "tarde"
        presente: data.presente,
        horaEntrada: data.horaEntrada || null,
        horaSalida: data.horaSalida || null,
      };
    });

    try {
      setSaving(true);
      await guardarAsistenciasTurnoFirebase(payload);

      Alert.alert(
        "Éxito",
        `Se guardaron ${payload.length} registros de asistencia para el turno ${turno.toUpperCase()} en la sala ${getSalaLabel(
          classroomCode
        )}.`
      );
    } catch (error) {
      console.log("Error guardando asistencias en Firebase:", error);
      Alert.alert(
        "Error",
        "No se pudieron guardar las asistencias. Intentalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  };

  //
  // 7) Render
  //
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

  const horariosTurno = TURNOS_HORARIOS[turno];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registro de Asistencia</Text>

      {/* Selector de sala (si tiene más de una) */}
      {classroomsList.length > 1 ? (
        <>
          <Text style={styles.subtitle}>Seleccioná la sala:</Text>
          <View style={styles.salasRow}>
            {classroomsList.map((salaCode) => (
              <TouchableOpacity
                key={salaCode}
                style={[
                  styles.salaBtn,
                  classroomCode === salaCode && styles.salaBtnActiva,
                ]}
                onPress={() => cambiarSala(salaCode)}
              >
                <Text
                  style={[
                    styles.salaTxt,
                    classroomCode === salaCode && styles.salaTxtActiva,
                  ]}
                >
                  {getSalaLabel(salaCode)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.subtitle}>
          Sala:{" "}
          <Text style={styles.subtitleSala}>
            {getSalaLabel(classroomCode)}
          </Text>
        </Text>
      )}

      <Text style={styles.subtitle}>Fecha: {fechaHoy}</Text>

      {/* Selector de Turno */}
      <View style={styles.turnos}>
        {["mañana", "siesta", "tarde"].map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.turnoBtn,
              turno === t && styles.turnoActivo,
            ]}
            onPress={() => setTurno(t)}
          >
            <Text
              style={[
                styles.turnoTexto,
                turno === t && styles.turnoTextoActivo,
              ]}
            >
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
          renderItem={({ item }) => {
            const data = asistenciaTurno[item.id] || {
              presente: null,
              horaEntrada: "",
              horaSalida: "",
            };

            return (
              <View style={styles.studentCard}>
                <Text style={styles.studentName}>
                  {item.firstName} {item.lastName}
                </Text>

                {/* Presente / Ausente */}
                <View style={styles.buttonsRow}>
                  <TouchableOpacity
                    style={[
                      styles.estadoBtn,
                      data.presente === true && styles.btnActivo,
                    ]}
                    onPress={() => marcarPresenteAusente(item.id, true)}
                  >
                    <Text
                      style={[
                        styles.estadoTxt,
                        data.presente === true && styles.estadoTxtActivo,
                      ]}
                    >
                      Presente
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.estadoBtn,
                      data.presente === false && styles.btnActivo,
                    ]}
                    onPress={() => marcarPresenteAusente(item.id, false)}
                  >
                    <Text
                      style={[
                        styles.estadoTxt,
                        data.presente === false && styles.estadoTxtActivo,
                      ]}
                    >
                      Ausente
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Horas solo si está marcado Presente */}
                {data.presente === true && (
                  <View style={styles.horasRow}>
                    <View style={styles.pickerContainer}>
                      <Text style={styles.pickerLabel}>Hora entrada</Text>
                      <Picker
                        selectedValue={data.horaEntrada}
                        onValueChange={(value) =>
                          cambiarHora(item.id, "horaEntrada", value)
                        }
                        style={styles.picker}
                      >
                        <Picker.Item label="Seleccionar" value="" />
                        {horariosTurno.map((h) => (
                          <Picker.Item key={h} label={h} value={h} />
                        ))}
                      </Picker>
                    </View>

                    <View style={styles.pickerContainer}>
                      <Text style={styles.pickerLabel}>Hora salida</Text>
                      <Picker
                        selectedValue={data.horaSalida}
                        onValueChange={(value) =>
                          cambiarHora(item.id, "horaSalida", value)
                        }
                        style={styles.picker}
                      >
                        <Picker.Item label="Seleccionar" value="" />
                        {horariosTurno.map((h) => (
                          <Picker.Item key={h} label={h} value={h} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Botón Guardar cambios */}
      <TouchableOpacity
        style={[styles.btnGuardar, saving && { opacity: 0.7 }]}
        onPress={guardarCambios}
        disabled={saving}
      >
        <Text style={styles.btnGuardarTxt}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Text>
      </TouchableOpacity>
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
    marginBottom: 4,
  },
  subtitleSala: {
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  salasRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 8,
    flexWrap: "wrap",
  },
  salaBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#eee",
    marginHorizontal: 4,
    marginVertical: 2,
  },
  salaBtnActiva: {
    backgroundColor: colors.primary,
  },
  salaTxt: {
    fontFamily: fonts.regular,
    color: colors.textDark,
  },
  salaTxtActiva: {
    fontFamily: fonts.bold,
    color: "#fff",
  },
  turnos: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
  },
  turnoBtn: {
    flex: 1,
    backgroundColor: "#eee",
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
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
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.secondary,
    marginTop: 12,
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
    backgroundColor: "#f2f2f2",
  },
  btnActivo: {
    backgroundColor: "#ccc", // gris para marcar selección
  },
  estadoTxt: {
    fontFamily: fonts.regular,
    color: colors.textDark,
  },
  estadoTxtActivo: {
    fontFamily: fonts.bold,
    color: "#000",
  },
  horasRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  pickerContainer: {
    flex: 1,
    marginRight: 6,
  },
  pickerLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginBottom: 2,
    color: colors.textDark,
  },
  picker: {
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
  },
  btnGuardar: {
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  btnGuardarTxt: {
    fontFamily: fonts.bold,
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
});
