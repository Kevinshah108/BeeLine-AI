// src/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "https://beeline-ai-backend.onrender.com/api",
});

export default API;