// src/firebase/asistencias.js
import { db } from "./firebase";
import { 
  collection, addDoc, getDocs, query, where, orderBy 
} from "firebase/firestore";
import { auth } from "./firebase";
import { serverTimestamp } from "firebase/firestore";

// Guardar asistencia en Firebase
export const guardarAsistenciaFirebase = async (asistencia) => {
  try {
    await addDoc(collection(db, "asistencias"), {
      ...asistencia,
      creadaPor: auth.currentUser.email,
      creadaEn: serverTimestamp(),
    });

    console.log("Asistencia guardada correctamente en Firebase");

  } catch (error) {
    console.error("Error guardando asistencia:", error);
  }
};

// Obtener todas las asistencias
export const obtenerAsistenciasFirebase = async () => {
  try {
    const q = query(
      collection(db, "asistencias"),
      orderBy("creadaEn", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  } catch (error) {
    console.error("Error obteniendo asistencias:", error);
    return [];
  }
};
