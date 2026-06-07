import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/v1/arko3d` : "http://localhost:8000/api/v1/arko3d";

export function useSolver(projectId) {
  // Mutación para enviar el cálculo
  const solveMutation = useMutation({
    mutationFn: (topology) => axios.post(`${API_URL}/${projectId}/solve`, topology),
  });

  // Query para obtener resultados (polling si es necesario)
  const useResults = (jobId) => useQuery({
    queryKey: ['results', jobId],
    queryFn: () => axios.get(`${API_URL}/jobs/${jobId}`).then(res => res.data),
    enabled: !!jobId,
    refetchInterval: (data) => data?.status === 'completed' ? false : 2000
  });

  return { solveMutation, useResults };
}