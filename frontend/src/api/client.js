import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 60_000,
})

// ─────────────────────────────────────────────────────────
// POST /predict/upload
// file: File object (.nii / .nii.gz)
// patientHistory: [{ week: number, volume: number }, ...]
// Returns: PredictionResponse
// ─────────────────────────────────────────────────────────
export async function predictFromUpload(file, patientHistory = []) {
  const form = new FormData()
  form.append('file', file)
  form.append('patient_history', JSON.stringify(patientHistory))

  const { data } = await http.post('/predict/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ─────────────────────────────────────────────────────────
// POST /predict/features
// measurements: [{ week: number, volume: number }, ...]
// Returns: PredictionResponse
// ─────────────────────────────────────────────────────────
export async function predictFromFeatures(measurements) {
  const { data } = await http.post('/predict/features', { measurements })
  return data
}

// ─────────────────────────────────────────────────────────
// GET /demo
// Returns: DemoPatient[]
// ─────────────────────────────────────────────────────────
export async function listDemoPatients() {
  const { data } = await http.get('/demo')
  return data
}

// ─────────────────────────────────────────────────────────
// GET /demo/{patient_id}
// Returns: PredictionResponse
// ─────────────────────────────────────────────────────────
export async function getDemoPatient(patientId) {
  const { data } = await http.get(`/demo/${encodeURIComponent(patientId)}`)
  return data
}

// ─────────────────────────────────────────────────────────
// GET /health
// Returns: HealthResponse
// ─────────────────────────────────────────────────────────
export async function getHealth() {
  const { data } = await http.get('/health')
  return data
}
