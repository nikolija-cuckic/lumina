import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5173',
  timeout: 60_000,
})

export async function predictFromFeatures(measurements) {
  const { data } = await http.post('/predict/features', { measurements })
  return data
}

export async function predictDemo(patientId) {
  const { data } = await http.get(`/demo/${encodeURIComponent(patientId)}`)
  return data
}

export async function listDemoPatients() {
  const { data } = await http.get('/demo')
  return data
}

export async function healthCheck() {
  const { data } = await http.get('/health')
  return data
}
