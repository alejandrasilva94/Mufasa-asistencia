// src/screens/AdminScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { Picker } from "@react-native-picker/picker";

import colors from "../theme/colors";
import { fonts } from "../theme/fonts";

import { obtenerAsistenciasFirebase } from "../firebase/asistencias";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";

const TURNOS = ["mañana", "siesta", "tarde"];

export default function AdminScreen() {
  // ---------- TABS ----------
  const [activeTab, setActiveTab] = useState("asistencias");
  // valores posibles: "asistencias" | "alumnos" | "maestras"

  // ---------- ASISTENCIAS ----------
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroFecha, setFiltroFecha] = useState(""); // ej: 2025-12-06 o 2025-12
  const [filtroTurno, setFiltroTurno] = useState(""); // "mañana" | "siesta" | "tarde"
  const [buscarNombre, setBuscarNombre] = useState(""); // parte del nombre
  const [filtroSala, setFiltroSala] = useState(""); // classroomCode

  // ---------- ALUMNOS ----------
  const [alumnos, setAlumnos] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  const [alumnoNombre, setAlumnoNombre] = useState("");
  const [alumnoApellido, setAlumnoApellido] = useState("");
  const [alumnoSala, setAlumnoSala] = useState("");
  const [alumnoEditId, setAlumnoEditId] = useState(null); // null = alta, no null = edición

  // Filtros lista alumnos
  const [filtroAlumnoNombre, setFiltroAlumnoNombre] = useState("");
  const [filtroAlumnoSala, setFiltroAlumnoSala] = useState("");

  // ---------- MAESTRAS ----------
  const [maestras, setMaestras] = useState([]);

  const [maestraEmail, setMaestraEmail] = useState("");
  const [maestraNombre, setMaestraNombre] = useState("");
  const [maestraSala, setMaestraSala] = useState("");
  const [maestraTurno, setMaestraTurno] = useState("");
  const [maestraEditId, setMaestraEditId] = useState(null); // uid de Firestore (mismo que Auth)

  const [filtroMaestraTexto, setFiltroMaestraTexto] = useState(""); // nombre o mail
  const [filtroMaestraSala, setFiltroMaestraSala] = useState("");
  const [filtroMaestraTurno, setFiltroMaestraTurno] = useState("");

  useEffect(() => {
    const inicial = async () => {
      try {
        setLoading(true);
        await Promise.all([
          cargarAsistencias(),
          cargarClassrooms(),
          cargarAlumnos(),
          cargarMaestras(),
        ]);
      } catch (error) {
        console.log("Error inicializando AdminScreen:", error);
        Alert.alert("Error", "No se pudo cargar la información del panel.");
      } finally {
        setLoading(false);
      }
    };

    inicial();
  }, []);

  // 🔹 Helper: usar el name de la sala si existe
  const getSalaLabel = (code) => {
    if (!code) return "-";
    const sala = classrooms.find((c) => c.code === code);
    return sala?.name || code;
  };

  // ---------- CARGA ASISTENCIAS ----------
  const cargarAsistencias = async () => {
    try {
      const data = await obtenerAsistenciasFirebase();
      setAsistencias(data);
    } catch (error) {
      console.log("Error cargando asistencias (Admin):", error);
      Alert.alert("Error", "No se pudieron cargar las asistencias.");
    }
  };

  // ---------- CARGA CLASSROOMS ----------
  const cargarClassrooms = async () => {
    try {
      const snap = await getDocs(collection(db, "classrooms"));
      const lista = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setClassrooms(lista);
    } catch (error) {
      console.log("Error cargando classrooms:", error);
    }
  };

  // ---------- CARGA ALUMNOS ----------
  const cargarAlumnos = async () => {
    try {
      const snap = await getDocs(collection(db, "students"));
      const lista = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const activos = lista.filter((a) => a.active !== false);
      setAlumnos(activos);
    } catch (error) {
      console.log("Error cargando alumnos:", error);
    }
  };

  // ---------- CARGA MAESTRAS ----------
  const cargarMaestras = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const lista = snap.docs.map((d) => ({
        id: d.id, // acá debería ser el UID de Auth
        ...d.data(),
      }));

      // role: "teacher" | "docente" | "maestra" y active !== false
      const docentes = lista.filter((u) => {
        const role = (u.role || "").toLowerCase();
        const esDocente =
          role === "teacher" || role === "docente" || role === "maestra";
        const activo = u.active !== false;
        return esDocente && activo;
      });

      setMaestras(docentes);
    } catch (error) {
      console.log("Error cargando maestras:", error);
    }
  };

  // ---------- FILTROS ASISTENCIAS ----------
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

  // ---------- STATS ASISTENCIAS ----------
  const total = asistenciasFiltradas.length;
  const presentes = asistenciasFiltradas.filter((a) => a.presente).length;
  const ausentes = asistenciasFiltradas.filter(
    (a) => a.presente === false
  ).length;

  // ---------- EXPORTAR EXCEL ----------
  const exportarExcel = async () => {
    try {
      if (!asistenciasFiltradas.length) {
        Alert.alert(
          "Sin datos",
          "No hay asistencias para exportar con los filtros actuales."
        );
        return;
      }

      const datos = asistenciasFiltradas.map((a) => ({
        Alumno: a.studentNombre || "",
        Fecha: a.fecha || "",
        Sala: getSalaLabel(a.classroomCode || ""),
        Turno: a.turno || "",
        Estado: a.presente ? "Presente" : "Ausente",
        "Hora entrada": a.horaEntrada || "",
        "Hora salida": a.horaSalida || "",
        Docente: a.creadaPorEmail || "",
      }));

      const hoja = XLSX.utils.json_to_sheet(datos);
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Asistencias");

      const excelBase64 = XLSX.write(libro, {
        type: "base64",
        bookType: "xlsx",
      });

      const fileUri =
        FileSystem.documentDirectory + "asistencias_mufasa.xlsx";

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
      Alert.alert(
        "Error",
        "No se pudo exportar el archivo de Excel. Intentá nuevamente."
      );
    }
  };

  // ---------- GESTIÓN DE ALUMNOS ----------
  const limpiarFormularioAlumno = () => {
    setAlumnoEditId(null);
    setAlumnoNombre("");
    setAlumnoApellido("");
    setAlumnoSala("");
  };

  const seleccionarAlumno = (alumno) => {
    setAlumnoEditId(alumno.id);
    setAlumnoNombre(alumno.firstName || "");
    setAlumnoApellido(alumno.lastName || "");
    setAlumnoSala(alumno.classroomCode || "");
  };

  const guardarAlumno = async () => {
    if (!alumnoNombre.trim()) {
      Alert.alert("Faltan datos", "Ingresá el nombre del alumno.");
      return;
    }
    if (!alumnoSala) {
      Alert.alert("Faltan datos", "Seleccioná una sala.");
      return;
    }

    try {
      if (alumnoEditId) {
        const ref = doc(db, "students", alumnoEditId);
        await updateDoc(ref, {
          firstName: alumnoNombre.trim(),
          lastName: alumnoApellido.trim(),
          classroomCode: alumnoSala,
          active: true,
        });
      } else {
        await addDoc(collection(db, "students"), {
          firstName: alumnoNombre.trim(),
          lastName: alumnoApellido.trim(),
          classroomCode: alumnoSala,
          active: true,
        });
      }

      await cargarAlumnos();
      limpiarFormularioAlumno();
    } catch (error) {
      console.log("Error guardando alumno:", error);
      Alert.alert("Error", "No se pudo guardar el alumno.");
    }
  };

  const quitarAlumno = (alumno) => {
    Alert.alert(
      "Quitar alumno",
      `¿Quitar a ${alumno.firstName} ${alumno.lastName} de la sala? (El historial de asistencias se mantiene)`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: async () => {
            try {
              const ref = doc(db, "students", alumno.id);
              await updateDoc(ref, { active: false });
              await cargarAlumnos();
            } catch (error) {
              console.log("Error quitando alumno:", error);
              Alert.alert("Error", "No se pudo quitar el alumno.");
            }
          },
        },
      ]
    );
  };

  // ---------- FILTROS LISTA ALUMNOS ----------
  const alumnosFiltrados = alumnos.filter((al) => {
    const nombreCompleto = `${al.firstName || ""} ${al.lastName || ""}`.trim();

    const nombreOk = filtroAlumnoNombre
      ? nombreCompleto.toLowerCase().includes(filtroAlumnoNombre.toLowerCase())
      : true;

    const salaOk = filtroAlumnoSala
      ? (al.classroomCode || "") === filtroAlumnoSala
      : true;

    return nombreOk && salaOk;
  });

  // ---------- GESTIÓN DE MAESTRAS ----------

  const limpiarFormularioMaestra = () => {
    setMaestraEditId(null);
    setMaestraEmail("");
    setMaestraNombre("");
    setMaestraSala("");
    setMaestraTurno("");
  };

  const seleccionarMaestra = (m) => {
    setMaestraEditId(m.id);
    setMaestraEmail(m.email || "");
    const nombreBase =
      m.displayName || m.name || m.fullName || m.email?.split("@")[0] || "";
    setMaestraNombre(nombreBase);
    const salas = Array.isArray(m.classrooms) ? m.classrooms : [];
    setMaestraSala(salas[0] || "");
    const turnoBase = m.turno || (Array.isArray(m.turnos) ? m.turnos[0] : "");
    setMaestraTurno(turnoBase || "");
  };

  const guardarMaestra = async () => {
    if (!maestraEditId) {
      Alert.alert(
        "Atención",
        "Para crear una maestra nueva tenés que hacerlo desde Firebase Authentication y la colección 'users'.\n\nDesde la app solo editamos maestras ya creadas."
      );
      return;
    }

    if (!maestraSala) {
      Alert.alert("Faltan datos", "Seleccioná una sala para la maestra.");
      return;
    }
    if (!maestraTurno) {
      Alert.alert("Faltan datos", "Seleccioná un turno para la maestra.");
      return;
    }

    try {
      const ref = doc(db, "users", maestraEditId);
      await updateDoc(ref, {
        email: maestraEmail || null,
        displayName: maestraNombre || null,
        role: "teacher",
        classrooms: [maestraSala],
        turno: maestraTurno,
        turnos: [maestraTurno],
        active: true,
      });

      await cargarMaestras();
      limpiarFormularioMaestra();
    } catch (error) {
      console.log("Error guardando maestra:", error);
      Alert.alert("Error", "No se pudo guardar la maestra.");
    }
  };

  const quitarMaestra = (m) => {
    Alert.alert(
      "Quitar maestra",
      `¿Quitar a ${m.displayName || m.email || "esta maestra"}? (El usuario seguirá existiendo en Auth, pero no aparecerá como maestra activa).`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: async () => {
            try {
              const ref = doc(db, "users", m.id);
              await updateDoc(ref, { active: false });
              await cargarMaestras();
            } catch (error) {
              console.log("Error quitando maestra:", error);
              Alert.alert("Error", "No se pudo quitar la maestra.");
            }
          },
        },
      ]
    );
  };

  // ---------- FILTROS LISTA MAESTRAS ----------
  const maestrasFiltradas = maestras.filter((m) => {
    const texto = `${m.displayName || m.name || ""} ${m.email || ""}`
      .toLowerCase()
      .trim();

    const textoOk = filtroMaestraTexto
      ? texto.includes(filtroMaestraTexto.toLowerCase())
      : true;

    const salas = Array.isArray(m.classrooms) ? m.classrooms : [];
    const salaPrincipal = salas[0] || "";
    const salaOk = filtroMaestraSala
      ? salaPrincipal === filtroMaestraSala
      : true;

    const turnoBase = m.turno || (Array.isArray(m.turnos) ? m.turnos[0] : "");
    const turnoOk = filtroMaestraTurno ? turnoBase === filtroMaestraTurno : true;

    return textoOk && salaOk && turnoOk;
  });

  // ---------- RENDER ----------

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8, fontFamily: fonts.regular }}>
          Cargando datos del panel...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panel de Administración</Text>

      {/* TABS */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "asistencias" && styles.tabBtnActive,
          ]}
          onPress={() => setActiveTab("asistencias")}
        >
          <Text
            style={[
              styles.tabTxt,
              activeTab === "asistencias" && styles.tabTxtActive,
            ]}
          >
            Asistencias
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "alumnos" && styles.tabBtnActive,
          ]}
          onPress={() => setActiveTab("alumnos")}
        >
          <Text
            style={[
              styles.tabTxt,
              activeTab === "alumnos" && styles.tabTxtActive,
            ]}
          >
            Gestión de alumnos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "maestras" && styles.tabBtnActive,
          ]}
          onPress={() => setActiveTab("maestras")}
        >
          <Text
            style={[
              styles.tabTxt,
              activeTab === "maestras" && styles.tabTxtActive,
            ]}
          >
            Gestión de maestras
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* TAB ASISTENCIAS */}
        {activeTab === "asistencias" && (
          <>
            <Text style={styles.sectionTitle}>Asistencias</Text>

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
              {TURNOS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.turnoBtn,
                    filtroTurno === t && styles.turnoActivo,
                  ]}
                  onPress={() =>
                    setFiltroTurno(filtroTurno === t ? "" : t)
                  }
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

            {/* LISTA DE ASISTENCIAS */}
            {asistenciasFiltradas.length === 0 ? (
              <Text style={styles.sinAlumnos}>
                No hay asistencias con los filtros actuales.
              </Text>
            ) : (
              asistenciasFiltradas.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardName}>{item.studentNombre}</Text>
                  <Text style={styles.cardTxt}>Fecha: {item.fecha}</Text>
                  <Text style={styles.cardTxt}>
                    Sala: {getSalaLabel(item.classroomCode)}
                  </Text>
                  <Text style={styles.cardTxt}>Turno: {item.turno}</Text>
                  <Text style={styles.cardTxt}>
                    Entrada: {item.horaEntrada || "-"} | Salida:{" "}
                    {item.horaSalida || "-"}
                  </Text>
                  <Text style={styles.cardTxt}>
                    Docente: {item.creadaPorEmail || "-"}
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
              ))
            )}
          </>
        )}

        {/* TAB ALUMNOS */}
        {activeTab === "alumnos" && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionTitle}>Gestión de alumnos</Text>

            {/* FORMULARIO ALUMNO */}
            <TextInput
              placeholder="Nombre"
              placeholderTextColor="#888"
              value={alumnoNombre}
              onChangeText={setAlumnoNombre}
              style={styles.input}
            />
            <TextInput
              placeholder="Apellido (opcional)"
              placeholderTextColor="#888"
              value={alumnoApellido}
              onChangeText={setAlumnoApellido}
              style={styles.input}
            />

            {/* SELECT DE SALA */}
            <View style={styles.pickerWrapper}>
              <Text style={styles.labelSmall}>Sala</Text>
              <Picker
                selectedValue={alumnoSala}
                onValueChange={(value) => setAlumnoSala(value)}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar sala" value="" />
                {classrooms.map((c) => (
                  <Picker.Item
                    key={c.id}
                    label={
                      c.name
                        ? `${c.name} (${c.code})`
                        : String(c.code || c.id)
                    }
                    value={c.code}
                  />
                ))}
              </Picker>
            </View>

            {/* BOTONES FORM ALUMNO */}
            <TouchableOpacity style={styles.btnAlumno} onPress={guardarAlumno}>
              <Text style={styles.btnAlumnoTxt}>
                {alumnoEditId ? "Actualizar alumno" : "Agregar alumno"}
              </Text>
            </TouchableOpacity>

            {alumnoEditId && (
              <TouchableOpacity
                style={styles.btnAlumnoSecundario}
                onPress={limpiarFormularioAlumno}
              >
                <Text style={styles.btnAlumnoSecundarioTxt}>
                  Cancelar edición
                </Text>
              </TouchableOpacity>
            )}

            {/* FILTROS PARA LA LISTA DE ALUMNOS */}
            <Text style={styles.sectionTitle}>Alumnos cargados</Text>

            <TextInput
              placeholder="Buscar alumno por nombre"
              placeholderTextColor="#888"
              value={filtroAlumnoNombre}
              onChangeText={setFiltroAlumnoNombre}
              style={styles.input}
            />

            <View style={styles.pickerWrapper}>
              <Text style={styles.labelSmall}>Filtrar por sala</Text>
              <Picker
                selectedValue={filtroAlumnoSala}
                onValueChange={(value) => setFiltroAlumnoSala(value)}
                style={styles.picker}
              >
                <Picker.Item label="Todas las salas" value="" />
                {classrooms.map((c) => (
                  <Picker.Item
                    key={c.id}
                    label={
                      c.name
                        ? `${c.name} (${c.code})`
                        : String(c.code || c.id)
                    }
                    value={c.code}
                  />
                ))}
              </Picker>
            </View>

            {/* LISTA DE ALUMNOS */}
            {alumnosFiltrados.length === 0 ? (
              <Text style={styles.sinAlumnos}>
                No hay alumnos que coincidan con los filtros.
              </Text>
            ) : (
              <View style={{ marginTop: 10 }}>
                {alumnosFiltrados.map((al) => (
                  <View key={al.id} style={styles.alumnoItem}>
                    <Text style={styles.alumnoName}>
                      {al.firstName} {al.lastName}
                    </Text>
                    <Text style={styles.alumnoSalaTxt}>
                      Sala: {getSalaLabel(al.classroomCode)}
                    </Text>
                    <View style={styles.alumnoActions}>
                      <TouchableOpacity
                        style={styles.smallButton}
                        onPress={() => seleccionarAlumno(al)}
                      >
                        <Text style={styles.smallButtonTxt}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.smallButton,
                          styles.smallButtonDanger,
                        ]}
                        onPress={() => quitarAlumno(al)}
                      >
                        <Text style={styles.smallButtonTxt}>Quitar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB MAESTRAS */}
        {activeTab === "maestras" && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionTitle}>Gestión de maestras</Text>

            <Text
              style={[
                styles.labelSmall,
                { marginBottom: 6, textAlign: "justify" },
              ]}
            >
              🔐 Para crear una maestra nueva tenés que:
              {"\n"}1) Darla de alta en Firebase Authentication.
              {"\n"}2) Crear/editar su documento en la colección "users" con el
              mismo UID.
              {"\n"}Desde acá el jardín puede asignar sala y turno, editar
              nombre y desactivar maestras.
            </Text>

            {/* FORMULARIO EDICIÓN MAESTRA */}
            <Text style={[styles.sectionTitle, { fontSize: 16 }]}>
              Detalle de maestra
            </Text>

            <TextInput
              placeholder="Email de la maestra (solo lectura)"
              placeholderTextColor="#888"
              value={maestraEmail}
              onChangeText={setMaestraEmail}
              style={[styles.input, { backgroundColor: "#f0f0f0" }]}
              editable={false}
            />

            <TextInput
              placeholder="Nombre de la maestra (opcional)"
              placeholderTextColor="#888"
              value={maestraNombre}
              onChangeText={setMaestraNombre}
              style={styles.input}
            />

            {/* Sala asignada */}
            <View style={styles.pickerWrapper}>
              <Text style={styles.labelSmall}>Sala asignada</Text>
              <Picker
                selectedValue={maestraSala}
                onValueChange={(value) => setMaestraSala(value)}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar sala" value="" />
                {classrooms.map((c) => (
                  <Picker.Item
                    key={c.id}
                    label={
                      c.name
                        ? `${c.name} (${c.code})`
                        : String(c.code || c.id)
                    }
                    value={c.code}
                  />
                ))}
              </Picker>
            </View>

            {/* Turno asignado */}
            <View style={styles.pickerWrapper}>
              <Text style={styles.labelSmall}>Turno asignado</Text>
              <Picker
                selectedValue={maestraTurno}
                onValueChange={(value) => setMaestraTurno(value)}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar turno" value="" />
                {TURNOS.map((t) => (
                  <Picker.Item key={t} label={t.toUpperCase()} value={t} />
                ))}
              </Picker>
            </View>

            {/* BOTONES FORM MAESTRA */}
            <TouchableOpacity style={styles.btnAlumno} onPress={guardarMaestra}>
              <Text style={styles.btnAlumnoTxt}>
                {maestraEditId
                  ? "Guardar cambios de maestra"
                  : "Seleccioná una maestra de la lista"}
              </Text>
            </TouchableOpacity>

            {maestraEditId && (
              <TouchableOpacity
                style={styles.btnAlumnoSecundario}
                onPress={limpiarFormularioMaestra}
              >
                <Text style={styles.btnAlumnoSecundarioTxt}>
                  Limpiar selección
                </Text>
              </TouchableOpacity>
            )}

            {/* FILTROS LISTA MAESTRAS */}
            <Text style={styles.sectionTitle}>Maestras cargadas</Text>

            <TextInput
              placeholder="Buscar por nombre o email"
              placeholderTextColor="#888"
              value={filtroMaestraTexto}
              onChangeText={setFiltroMaestraTexto}
              style={styles.input}
            />

            <View style={styles.pickerWrapper}>
              <Text style={styles.labelSmall}>Filtrar por sala</Text>
              <Picker
                selectedValue={filtroMaestraSala}
                onValueChange={(value) => setFiltroMaestraSala(value)}
                style={styles.picker}
              >
                <Picker.Item label="Todas las salas" value="" />
                {classrooms.map((c) => (
                  <Picker.Item
                    key={c.id}
                    label={
                      c.name
                        ? `${c.name} (${c.code})`
                        : String(c.code || c.id)
                    }
                    value={c.code}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerWrapper}>
              <Text style={styles.labelSmall}>Filtrar por turno</Text>
              <Picker
                selectedValue={filtroMaestraTurno}
                onValueChange={(value) => setFiltroMaestraTurno(value)}
                style={styles.picker}
              >
                <Picker.Item label="Todos los turnos" value="" />
                {TURNOS.map((t) => (
                  <Picker.Item key={t} label={t.toUpperCase()} value={t} />
                ))}
              </Picker>
            </View>

            {/* LISTA MAESTRAS */}
            {maestrasFiltradas.length === 0 ? (
              <Text style={styles.sinAlumnos}>
                No hay maestras que coincidan con los filtros.
              </Text>
            ) : (
              <View style={{ marginTop: 10 }}>
                {maestrasFiltradas.map((m) => {
                  const salas = Array.isArray(m.classrooms)
                    ? m.classrooms
                    : [];
                  const salaPrincipal = salas[0] || "-";
                  const turnoBase =
                    m.turno ||
                    (Array.isArray(m.turnos) ? m.turnos[0] : "") ||
                    "-";

                  return (
                    <View key={m.id} style={styles.alumnoItem}>
                      <Text style={styles.alumnoName}>
                        {m.displayName || m.name || m.email || "Sin nombre"}
                      </Text>
                      <Text style={styles.alumnoSalaTxt}>
                        Email: {m.email || "-"}
                      </Text>
                      <Text style={styles.alumnoSalaTxt}>
                        Sala: {getSalaLabel(salaPrincipal)}
                      </Text>
                      <Text style={styles.alumnoSalaTxt}>
                        Turno: {turnoBase}
                      </Text>

                      <View style={styles.alumnoActions}>
                        <TouchableOpacity
                          style={styles.smallButton}
                          onPress={() => seleccionarMaestra(m)}
                        >
                          <Text style={styles.smallButtonTxt}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.smallButton,
                            styles.smallButtonDanger,
                          ]}
                          onPress={() => quitarMaestra(m)}
                        >
                          <Text style={styles.smallButtonTxt}>Quitar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
    marginBottom: 12,
  },

  // TABS
  tabsRow: {
    flexDirection: "row",
    marginBottom: 10,
    backgroundColor: "#e0e0e0",
    borderRadius: 12,
    padding: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "#fff",
  },
  tabTxt: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textDark,
    textAlign: "center",
  },
  tabTxtActive: {
    fontFamily: fonts.bold,
    color: colors.secondary,
  },

  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.secondary,
    marginBottom: 8,
    marginTop: 8,
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

  // Asistencias
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

  // Alumnos / Maestras comunes
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  labelSmall: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textDark,
    marginLeft: 8,
    marginTop: 4,
  },
  picker: {
    width: "100%",
  },
  btnAlumno: {
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  btnAlumnoTxt: {
    fontFamily: fonts.bold,
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
  },
  btnAlumnoSecundario: {
    paddingVertical: 10,
  },
  btnAlumnoSecundarioTxt: {
    fontFamily: fonts.regular,
    color: colors.textDark,
    textAlign: "center",
  },
  sinAlumnos: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontStyle: "italic",
    color: colors.textDark,
  },
  alumnoItem: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  alumnoName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.secondary,
  },
  alumnoSalaTxt: {
    fontFamily: fonts.regular,
    color: colors.textDark,
    marginTop: 2,
  },
  alumnoActions: {
    flexDirection: "row",
    marginTop: 6,
    justifyContent: "flex-end",
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#ddd",
    marginLeft: 6,
  },
  smallButtonDanger: {
    backgroundColor: "#E05656",
  },
  smallButtonTxt: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#000",
  },
});
