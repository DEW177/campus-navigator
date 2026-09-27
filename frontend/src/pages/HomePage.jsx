import React from "react";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="page home-page">
      <h1>Campus Navigator</h1>
      <p>ระบบนำทางและค้นหาห้องเรียนภายในวิทยาเขต</p>
      <nav>
        <Link to="/search">ค้นหาห้อง</Link>
        <Link to="/navigate">นำทาง</Link>
        <Link to="/schedule">ตารางเรียน</Link>
      </nav>
    </div>
  );
}
