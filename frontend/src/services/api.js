import axios from "axios";

const api = axios.create({ baseURL: "/api" });

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
