import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import SchedulePage from "./pages/SchedulePage";
import NavigationPage from "./pages/NavigationPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/navigate" element={<NavigationPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
