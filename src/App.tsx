import { Navigate, Route, Routes } from "react-router-dom";
import { ContactFormPage } from "./form";
import { SpiralDemoPage } from "./spiral-demo/SpiralDemoPage";

/**
 * Маршруты приложения. Контактная форма доступна по адресу
 * /newmaterialai-contact-form, демо спирали — по адресу /spiral,
 * остальные адреса редиректят на контактную форму.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/newmaterialai-contact-form" element={<ContactFormPage />} />
      <Route path="/spiral" element={<SpiralDemoPage />} />
      <Route path="*" element={<Navigate to="/newmaterialai-contact-form" replace />} />
    </Routes>
  );
}
