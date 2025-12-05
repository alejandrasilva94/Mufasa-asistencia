// src/firebase/asistencias.js
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  writeBatch,
  doc,
} from "firebase/firestore";
import { auth } from "./firebase";
import { serverTimestamp } from "firebase/firestore";

// 🔹 Versión vieja (la dejamos por si en algún momento te sirve para algo simple)
export const guardarAsistenciaFirebase = async (asistencia) => {
  try {
    await addDoc(collection(db, "asistencias"), {
      ...asistencia,
      creadaPorEmail: auth.currentUser?.email || null,
      creadaEn: serverTimestamp(),
    });

    console.log("Asistencia guardada correctamente en Firebase");
  } catch (error) {
    console.error("Error guardando asistencia:", error);
  }
};

// 🔹 Obtener todas las asistencias (para el Panel Admin)
export const obtenerAsistenciasFirebase = async () => {
  try {
    const q = query(
      collection(db, "asistencias"),
      orderBy("creadaEn", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (error) {
    console.error("Error obteniendo asistencias:", error);
    return [];
  }
};

// 🔹 NUEVO: guardar varias asistencias de un turno en un solo batch
export const guardarAsistenciasTurnoFirebase = async (listaAsistencias) => {
  if (!auth.currentUser) {
    throw new Error("No hay usuario autenticado para guardar asistencias.");
  }

  if (!Array.isArray(listaAsistencias) || !listaAsistencias.length) {
    return;
  }

  const batch = writeBatch(db);

  listaAsistencias.forEach((reg) => {
    const { studentId, fecha, turno, ...resto } = reg;

    // ID determinístico: un doc por alumno + día + turno
    const docId = `${fecha}_${turno}_${studentId}`;

    const ref = doc(collection(db, "asistencias"), docId);

    batch.set(ref, {
      studentId,
      fecha,
      turno,
      ...resto,
      creadaPorEmail: auth.currentUser.email,
      creadaEn: serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`✅ Guardadas ${listaAsistencias.length} asistencias en batch.`);
};
