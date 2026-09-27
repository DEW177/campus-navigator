import React, { useState } from "react";

/** Search input for finding rooms/buildings by name. */
export default function SearchBar({ onSearch, placeholder = "ค้นหาห้องเรียน หรืออาคาร..." }) {
  const [value, setValue] = useState("");

  const handleChange = (e) => {
    setValue(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className="search-bar"
    />
  );
}
