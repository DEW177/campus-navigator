import React from "react";
import { Navigate, useSearchParams } from "react-router-dom";

/** Keep old search links working while the home page owns room search. */
export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get("q");
  const target = query ? `/?${new URLSearchParams({ q: query })}` : "/";
  return <Navigate to={target} replace />;
}
