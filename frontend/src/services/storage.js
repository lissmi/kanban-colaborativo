// Este servicio gestiona el almacenamiento TEMPORAL del tablero en el navegador.
// Cuando tengamos Express + MongoDB, reemplazaremos estas funciones por llamadas a la API.
const STORAGE_KEY = 'kanban-colaborativo-demo-v1';

export function readWorkspace() {
  try {
    // Recupera el JSON previamente guardado, si existe.
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    // Un JSON corrupto o un navegador sin localStorage no debe romper la interfaz.
    console.warn('No se pudo recuperar el tablero local:', error);
    return null;
  }
}

export function saveWorkspace(data) {
  try {
    // Convierte el objeto JavaScript a texto para almacenarlo.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('No se pudo guardar el tablero local:', error);
  }
}
