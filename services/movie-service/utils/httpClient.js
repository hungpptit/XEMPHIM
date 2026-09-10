import axios from 'axios';

const DEFAULT_TIMEOUT_MS = parseInt(process.env.HTTP_TIMEOUT_MS || '5000', 10);

const httpClient = axios.create({
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Service': 'movie-service'
  }
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error(`⏱️ [MovieService][HTTP Timeout] Request to ${error.config?.url} exceeded ${DEFAULT_TIMEOUT_MS}ms`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`🔌 [MovieService][HTTP ConnRefused] Cannot connect to downstream service at ${error.config?.url}`);
    }
    return Promise.reject(error);
  }
);

export default httpClient;
