import axios from "axios";

const API = axios.create({
  baseURL: "https://rgmedlink-backend001.onrender.com/api",
});

export default API;