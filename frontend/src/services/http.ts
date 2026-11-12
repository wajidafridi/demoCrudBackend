import axios from 'axios'

/** Shared Axios client. Feature services will import this — do not call Axios from components. */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})
