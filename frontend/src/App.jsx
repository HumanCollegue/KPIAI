import { BrowserRouter, Routes, Route } from "react-router-dom";
import CompanySelectPage from "./pages/CompanySelectPage";
import TriagePage from "./pages/TriagePage";
import KPIPage from "./pages/KPIPage";
import TutorialOverlay from "./components/TutorialOverlay";

export default function App() {
  return (
    <BrowserRouter>
      <TutorialOverlay />
      <Routes>
        <Route path="/"      element={<CompanySelectPage />} />
        <Route path="/triage" element={<TriagePage />} />
        <Route path="/kpis"   element={<KPIPage />} />
      </Routes>
    </BrowserRouter>
  );
}
