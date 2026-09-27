import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function SchedulePage() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    api.get("/courses/").then((res) => setCourses(res.data)).catch(console.error);
  }, []);

  return (
    <div className="page schedule-page">
      <h2>ตารางเรียน</h2>
      <ul>
        {courses.map((c) => (
          <li key={c.id}>
            {c.code} - {c.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
