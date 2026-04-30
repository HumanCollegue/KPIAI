import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: `${BASE_URL}/api` });

export const companiesApi = {
  list: () => api.get("/companies/"),
};

export const triageApi = {
  run: (company_filename) => api.post("/triage/", { company_filename }),
};

export const kpisApi = {
  catalog: () => api.get("/kpis/catalog"),
  calculate: (kpi_name, extraction_result) =>
    api.post("/kpis/calculate", { kpi_name, extraction_result }),
};

export const displayNamesApi = {
  list: () => api.get("/display-names/"),
  set:  (legalName, displayName) =>
    api.put(`/display-names/${encodeURIComponent(legalName)}`, { display_name: displayName }),
};

export default api;
