import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MapPage from "./pages/MapPage";

// L'éditeur (et MapLibre GL) ne sont chargés qu'à l'ouverture de la page.
const EditorPage = lazy(() => import("./pages/EditorPage"));

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route
          path="/editor"
          element={
            <Suspense fallback={<div className="route-loading">Chargement…</div>}>
              <EditorPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
