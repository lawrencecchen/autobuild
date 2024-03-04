import { useState } from "react";
import { useEventListener } from "usehooks-ts";

export function useWindowScroll() {
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  useEventListener("scroll", () => {
    setScrollPosition({ x: window.scrollX, y: window.scrollY });
  });

  return scrollPosition;
}
