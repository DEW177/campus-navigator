import React, { useState } from "react";

/** Search input for finding rooms/buildings by name. */
export default function SearchBar({ onSearch, placeholder = "พิมพ์ชื่อหรือรหัสห้อง เช่น SC06-301" }) {
  const [value, setValue] = useState("");

  const handleChange = (e) => {
    setValue(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <input
      type="text"
      aria-label="ค้นหาห้องเรียน"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className="search-bar"
    />
  );
}
