import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ventify_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ventify_token')
      localStorage.removeItem('ventify_user')
      window.location.href = '/stock/login'
    }
    return Promise.reject(err)
  }
)

export default api
