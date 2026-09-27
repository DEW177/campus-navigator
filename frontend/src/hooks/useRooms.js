import { useEffect, useState } from "react";
import api from "../services/api";

/** Fetch rooms, optionally filtered by a search query. */
export default function useRooms(search = "") {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get("/rooms", { params: search ? { search } : {} })
      .then((res) => setRooms(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  return { rooms, loading };
}
