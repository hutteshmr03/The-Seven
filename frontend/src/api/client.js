import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

const client = axios.create({
  baseURL,
});

client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("friendzone_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function prefixUploadUrls(data) {
  if (!data) return data;

  if (typeof data === "string") {
    if (data.startsWith("/uploads/")) {
      const serverRoot = baseURL.endsWith("/api") ? baseURL.slice(0, -4) : baseURL;
      const cleanRoot = serverRoot.replace(/\/$/, "");
      return `${cleanRoot}${data}`;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => prefixUploadUrls(item));
  }

  if (typeof data === "object") {
    if (Object.prototype.toString.call(data) === "[object Object]") {
      const updated = {};
      for (const key of Object.keys(data)) {
        updated[key] = prefixUploadUrls(data[key]);
      }
      return updated;
    }
  }

  return data;
}

client.interceptors.response.use(
  (res) => {
    if (res.data) {
      res.data = prefixUploadUrls(res.data);
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem("friendzone_token");
      sessionStorage.removeItem("friendzone_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default client;
