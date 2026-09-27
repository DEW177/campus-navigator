import React from "react";

export default function StartLocationPicker({ locations, value, onChange, disabled = false }) {
  return (
    <div className="start-location-picker">
      <label htmlFor="start-location">ตอนนี้คุณอยู่ตรงไหน?</label>
      <p id="start-location-help">เลือกสถานที่ที่ตรงกับตำแหน่งที่คุณยืนอยู่</p>
      <select
        id="start-location"
        aria-describedby="start-location-help"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required
      >
        <option value="">เลือกจุดเริ่มต้น</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.label} — ชั้น {location.floor}
          </option>
        ))}
      </select>
    </div>
  );
}
