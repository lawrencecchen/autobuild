"use client";

import dynamic from "next/dynamic";

export const RunSQL = dynamic(
  () => import("./run-sql").then((mod) => mod.RunSQL),
  {
    ssr: false,
    loading: () => (
      <div className="bg-zinc-900 rounded-lg px-4 py-5 text-center text-xs">
        {/* Loading... */}
      </div>
    ),
  }
);

export const Table = dynamic(() => import("./table").then((mod) => mod.Table), {
  ssr: false,
  loading: () => (
    <div className="bg-zinc-900 rounded-lg px-4 py-5 text-center text-xs">
      {/* Loading... */}
    </div>
  ),
});
