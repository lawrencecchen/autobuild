"use client";

import dynamic from "next/dynamic";

export const RunSQL = dynamic(
  () => import("./run-sql").then((mod) => mod.RunSQL),
  {
    ssr: false,
    // loading: () => (
    //   <div className="px-4 py-5 text-center text-xs">
    //     Loading data...
    //   </div>
    // ),
  }
);

export const Table = dynamic(() => import("./table").then((mod) => mod.Table), {
  ssr: false,
  loading: () => (
    <div className="px-4 py-5 text-center text-xs">Loading data...</div>
  ),
});

export const RenderReact = dynamic(
  () => import("./render-react").then((mod) => mod.RenderReact),
  {
    ssr: false,
  }
);

export const Continue = dynamic(
  () => import("./continue").then((mod) => mod.Continue),
  {
    ssr: false,
  }
);
