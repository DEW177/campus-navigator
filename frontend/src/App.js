import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";

import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import NavigationPage from "./pages/NavigationPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/navigate" element={<NavigationPage />} />

        {/* พักตารางเรียน ลิงก์เดิมจะกลับหน้าแรก */}
        <Route
          path="/schedule"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;