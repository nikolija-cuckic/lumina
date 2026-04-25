import { useState, useCallback } from 'react'
import { predictFromFeatures, predictDemo } from '../api/client'

export function usePrediction(initialData = null) {
  const [predictionData, setPredictionData] = useState(initialData)
  const [isLoading, setIsLoading]           = useState(false)
  const [error, setError]                   = useState(null)
  const [activeCILevels, setActiveCILevels] = useState([70, 90])

  const runPrediction = useCallback(async (measurements) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await predictFromFeatures(measurements)
      setPredictionData(result)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Došlo je do greške. Pokušajte ponovo.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadDemo = useCallback(async (patientId) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await predictDemo(patientId)
      setPredictionData(result)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Došlo je do greške. Pokušajte ponovo.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resetPrediction = useCallback(() => {
    setPredictionData(null)
    setError(null)
  }, [])

  return {
    predictionData,
    isLoading,
    error,
    activeCILevels,
    setActiveCILevels,
    runPrediction,
    loadDemo,
    resetPrediction,
  }
}
