import { useEffect, useState } from "react";
import api from "../services/api";

/** Fetch rooms, optionally filtered by a search query. */
export default function useRooms(search = "") {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setRooms([]);
    setError("");
    api
      .get("/rooms/", { params: search.trim() ? { search: search.trim() } : {}, signal: controller.signal })
      .then((res) => { if (!controller.signal.aborted) setRooms(res.data); })
      .catch(() => {
        if (!controller.signal.aborted) setError("โหลดรายการห้องไม่ได้ กรุณาลองอีกครั้ง");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, attempt]);

  return { rooms, loading, error, retry: () => setAttempt((value) => value + 1) };
}
