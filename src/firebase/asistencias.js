// src/firebase/asistencias.js
import { db, auth } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";

// Guardar asistencia en Firebase
export const guardarAsistenciaFirebase = async (asistencia) => {
  try {
    const user = auth.currentUser;

    await addDoc(collection(db, "asistencias"), {
      ...asistencia,
      creadaPorUid: user ? user.uid : null,
      creadaPorEmail: user ? user.email : null,
      creadaEn: serverTimestamp(),
    });

    console.log("Asistencia guardada correctamente en Firebase");
  } catch (error) {
    console.error("Error guardando asistencia:", error);
  }
};

// Obtener todas las asistencias (ordenadas por fecha de creación, descendente)
export const obtenerAsistenciasFirebase = async () => {
  try {
    const q = query(
      collection(db, "asistencias"),
      orderBy("creadaEn", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (error) {
    console.error("Error obteniendo asistencias:", error);
    return [];
  }
};

// (Opcional) Obtener asistencias por fecha específica (YYYY-MM-DD)
export const obtenerAsistenciasPorFecha = async (fecha) => {
  try {
    const q = query(
      collection(db, "asistencias"),
      where("fecha", "==", fecha),
      orderBy("creadaEn", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (error) {
    console.error("Error obteniendo asistencias por fecha:", error);
    return [];
  }
};
