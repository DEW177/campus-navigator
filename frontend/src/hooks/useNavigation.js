import { useState, useCallback, useEffect, useRef } from "react";
import { getRoute } from "../services/mapService";

/** Cancel obsolete requests so changing a location cannot show an old route. */
export default function useNavigation() {
  const [path, setPath] = useState([]);
  const [distance, setDistance] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(null);

  const reset = useCallback(() => {
    pending.current?.abort();
    pending.current = null;
    setPath([]);
    setDistance(null);
    setRoute(null);
    setLoading(false);
    setError("");
  }, []);

  useEffect(() => () => pending.current?.abort(), []);

  const navigate = useCallback(async (startNodeId, endNodeId, routeMode = "shortest") => {
    reset();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    try {
      const data = await getRoute(startNodeId, endNodeId, controller.signal, routeMode);
      if (!controller.signal.aborted) {
        setPath(data.path);
        setDistance(data.total_distance);
        setRoute(data);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const code = err.response?.data?.detail?.code;
      const messages = {
        NODE_NOT_FOUND: "จุดเริ่มต้นหรือจุดหมายไม่มีในระบบแล้ว กรุณาเลือกใหม่",
        ROUTE_NOT_FOUND: "ไม่พบเส้นทางจากจุดนี้ไปยังห้องที่เลือก ลองเลือกจุดเริ่มต้นหรือวิธีขึ้นลงชั้นใหม่",
        INVALID_MAP_DATA: "ข้อมูลแผนผังหรือทางเชื่อมยังไม่สมบูรณ์ กรุณาเลือกเส้นทางอื่น",
      };
      setError(messages[code] || "คำนวณเส้นทางไม่ได้ กรุณาลองอีกครั้ง");
    } finally {
      if (!controller.signal.aborted) {
        pending.current = null;
        setLoading(false);
      }
    }
  }, [reset]);

  return { path, distance, route, loading, error, navigate, reset };
}
