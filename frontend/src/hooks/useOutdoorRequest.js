import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";

const messages = {
  NOT_CONFIGURED: "บริการค้นหาและเส้นทางยังไม่พร้อม เลือกจุดบนแผนที่และเปิด Google Maps ได้",
  PROVIDER_AUTH: "บริการค้นหาและเส้นทางยังไม่พร้อม กรุณาแจ้งผู้ดูแลระบบ",
  DAILY_LIMIT: "วันนี้ใช้บริการค้นหาและเส้นทางถึงขีดจำกัดแล้ว เลือกจุดบนแผนที่หรือเปิด Google Maps ได้",
  RATE_LIMIT: "มีคำขอพร้อมกันมาก กรุณารอสักครู่แล้วลองอีกครั้ง",
  PROVIDER_LIMIT: "บริการค้นหาและเส้นทางถึงขีดจำกัดชั่วคราว ลองอีกครั้งภายหลัง หรือเปิด Google Maps",
  PROVIDER_TIMEOUT: "บริการตอบกลับช้า กรุณาลองอีกครั้ง หรือเปิด Google Maps",
  ROUTE_NOT_FOUND: "ไม่พบเส้นทางสำหรับวิธีเดินทางนี้ ลองเปลี่ยนจุดเริ่มต้นหรือวิธีเดินทาง",
  ENTRANCE_UNMAPPED: "อาคารนี้ยังไม่มีพิกัดทางเข้าสำหรับเส้นทางกลางแจ้ง",
  BUILDING_NOT_FOUND: "ไม่พบอาคารที่เลือก กรุณาเลือกห้องใหม่",
};

export default function useOutdoorRequest(path) {
  const controller = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setData(null); setLoading(false); setError("");
  }, []);
  useEffect(() => () => controller.current?.abort(), []);
  const run = useCallback(async (body) => {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setData(null); setError(""); setLoading(true);
    try {
      const response = await api.post(path, body, { signal: current.signal, timeout: 18000 });
      if (current.signal.aborted) return;
      setData(response.data);
      return response.data;
    } catch (failure) {
      if (!current.signal.aborted) setError(messages[failure.response?.data?.detail?.code]
        || "โหลดข้อมูลไม่ได้ กรุณาลองอีกครั้ง หรือเลือกจุดบนแผนที่และเปิด Google Maps");
    } finally {
      if (controller.current === current) {
        controller.current = null;
        if (!current.signal.aborted) setLoading(false);
      }
    }
  }, [path]);
  return { data, loading, error, run, reset };
}
