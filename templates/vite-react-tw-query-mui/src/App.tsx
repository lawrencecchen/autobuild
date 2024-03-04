import React, { Suspense, useEffect, useRef } from "react";
import { Highlighter } from "./highlighter/Highlighter";

const searchParams = new URLSearchParams(window.location.search);
const componentName = searchParams.get("c");

function Comment() {
  return (
    <>
      <Highlighter />
    </>
  );
}

// Dynamically import the component based on the component name
const UserComponent = componentName
  ? React.lazy(() => import(`./c/${componentName}.tsx`))
  : null;

function App() {
  const iframeReady = useRef(false);
  useEffect(() => {
    if (iframeReady.current) {
      return;
    }
    iframeReady.current = true;
    window.postMessage("iframe-ready", "*");
  }, []);
  if (!componentName) {
    return <div className="p-4">No component</div>;
  }
  return (
    <>
      <Suspense fallback={<div className="p-4">Loading...</div>}>
        {UserComponent && <UserComponent />}
      </Suspense>
      <Comment />
    </>
  );
}

export default App;
