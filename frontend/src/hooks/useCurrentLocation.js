import { useCallback, useEffect, useRef, useState } from "react";
import { hasCoordinates } from "../utils/location";

/** One user-requested fix, in memory only. No floor inference or live tracking. */
export default function useCurrentLocation() {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; }, []);

  const cancel = useCallback(() => {
    request.current += 1;
    setLoading(false);
  }, []);

  const locate = useCallback(() => {
    const id = ++request.current;
    setPosition(null);
    setError("");
    if (!window.isSecureContext) {
      setError("อ่านตำแหน่งไม่ได้: กรุณาเปิดเว็บผ่าน HTTPS บนมือถือ คุณยังดูตำแหน่งอาคารและผังห้องได้");
      setLoading(false);
      return;
    }
    if (!navigator.geolocation) {
      setError("เบราว์เซอร์นี้ไม่รองรับการอ่านตำแหน่ง กรุณาเปิดด้วยเบราว์เซอร์อื่น");
      setLoading(false);
      return;
    }
    setLoading(true);
    const fail = (failure) => {
      if (id !== request.current) return;
      const messages = {
        1: "ยังไม่ได้รับอนุญาตให้ใช้ตำแหน่ง กรุณาอนุญาตตำแหน่งในการตั้งค่าเว็บไซต์ แล้วลองอีกครั้ง",
        2: "หาตำแหน่งไม่ได้ กรุณาตรวจว่ามือถือเปิดตำแหน่งอยู่ แล้วลองอีกครั้ง",
        3: "หาตำแหน่งนานเกินไป กรุณาลองอีกครั้งในบริเวณที่รับสัญญาณได้ดี",
      };
      setError(messages[failure?.code] || "อ่านตำแหน่งไม่ได้ กรุณาลองอีกครั้ง");
      setLoading(false);
    };
    try {
      navigator.geolocation.getCurrentPosition((result) => {
        if (id !== request.current) return;
        const coords = result.coords;
        if (!hasCoordinates(coords) || !Number.isFinite(coords.accuracy) || coords.accuracy < 0) {
          fail({ code: 2 });
          return;
        }
        setPosition({ latitude: coords.latitude, longitude: coords.longitude,
          accuracy: coords.accuracy });
        setLoading(false);
      }, fail, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    } catch (failure) {
      fail(failure);
    }
  }, []);

  return { position, loading, error, locate, cancel };
}
