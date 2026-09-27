import React from "react";

/** Controlled input stays in sync with saved searches and browser history. */
export default function SearchBar({
  id = "room-search", value = "", onSearch,
  placeholder = "พิมพ์ชื่อหรือรหัสห้อง เช่น SC06-301",
}) {
  return (
    <input
      id={id}
      type="text"
      aria-label="ค้นหาห้องเรียน"
      value={value}
      onChange={(event) => onSearch?.(event.target.value)}
      placeholder={placeholder}
      className="search-bar"
    />
  );
}
