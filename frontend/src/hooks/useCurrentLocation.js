import { useCallback, useEffect, useRef, useState } from "react";
import { hasCoordinates } from "../utils/location";

/** One user-requested fix, in memory only. No floor inference or live tracking. */
export default function useCurrentLocation() {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; }, []);

  const cancel = useCallback(() => {
    request.current += 1;
    setLoading(false);
    setRetrying(false);
  }, []);

  const locate = useCallback(() => {
    const id = ++request.current;
    setPosition(null);
    setError("");
    setErrorCode(null);
    setRetrying(false);
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
        2: "หาตำแหน่งไม่ได้ ลองอีกครั้ง หรือให้ Google Maps หาตำแหน่งของคุณแทน",
        3: "หาตำแหน่งนานเกินไป ลองอีกครั้ง หรือให้ Google Maps หาตำแหน่งของคุณแทน",
      };
      setError(messages[failure?.code] || "อ่านตำแหน่งไม่ได้ กรุณาลองอีกครั้ง");
      setErrorCode(failure?.code ?? null);
      setLoading(false);
      setRetrying(false);
    };
    let phase = 0;
    const acquire = (precise) => {
      const currentPhase = ++phase;
      let settled = false;
      const active = () => id === request.current && currentPhase === phase && !settled;
      const failure = (reason) => {
        if (!active()) return;
        settled = true;
        // Retry acquisition failures once, never a permission denial. A request
        // for high accuracy is a hint, not a requirement for a useful position.
        if (!precise && [2, 3].includes(reason?.code)) {
          setRetrying(true);
          acquire(true);
        } else {
          fail(reason);
        }
      };
      try {
        navigator.geolocation.getCurrentPosition((result) => {
          if (!active()) return;
          settled = true;
          const coords = result?.coords;
          if (!hasCoordinates(coords) || !Number.isFinite(coords.accuracy) || coords.accuracy < 0) {
            fail({ code: 2 });
            return;
          }
          setPosition({ latitude: coords.latitude, longitude: coords.longitude,
            accuracy: coords.accuracy });
          setLoading(false);
          setRetrying(false);
        }, failure, precise
          ? { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
          : { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 });
      } catch (reason) {
        failure(reason);
      }
    };
    acquire(false);
  }, []);

  return { position, loading, retrying, error, errorCode, locate, cancel };
}
