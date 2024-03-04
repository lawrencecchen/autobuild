import { EditorView } from "@codemirror/view";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { javascript } from "@codemirror/lang-javascript";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useWebContainer } from "@/lib/hooks/useWebContainer";
import { WebContainer } from "@webcontainer/api";

function convertToWebContainerUrl(
  creationId: string,
  webContainerUrl: string
): string {
  return `${webContainerUrl}/?component=${creationId}`;
}

function RenderReactIframe({
  id,
  code,
  render,
}: {
  id: string;
  code: string;
  render: string;
}) {
  const sandbox = useWebContainer();
  const mainIframePreviewUrl = sandbox.url;
  const mainIframePreviewRef = useRef<HTMLIFrameElement>(null);
  if (!mainIframePreviewUrl) {
    return null;
  }
  return (
    <iframe src={mainIframePreviewUrl} ref={mainIframePreviewRef}></iframe>
  );
}
function createPath({ creationId }: { creationId: string }) {
  return `./src/c/${creationId}.tsx`;
}
export function RenderReact({
  id,
  code: initialCode,
  render: initialRender,
}: {
  id: string;
  code: string;
  render: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [render, setRender] = useState(initialRender);
  const extensions = useMemo(
    () => [
      javascript({ jsx: true, typescript: true }),
      EditorView.theme({
        ".cm-scroller": {
          overflow: "auto",
          height: "100px",
          fontSize: "12px",
          fontFamily: "var(--font-geist-mono)",
        },
      }),
    ],
    []
  );
  const { webContainer } = useWebContainer();
  const onCodeChange = useCallback(
    (value: string) => {
      setCode(value);
      if (!webContainer) {
        return;
      }
      const path = createPath({ creationId: id });
      void webContainer.fs.writeFile(path, code, {
        encoding: "utf-8",
      });
    },
    [code, id, webContainer]
  );
  const onRenderChange = useCallback(
    (value: string) => {
      setRender(value);
      if (!webContainer) {
        return;
      }
      const path = createPath({ creationId: id });
      void webContainer.fs.writeFile(path, render, {
        encoding: "utf-8",
      });
    },
    [render, id, webContainer]
  );
  useEffect(() => {
    if (!webContainer) {
      return;
    }
    const path = createPath({ creationId: id });
    void webContainer.fs.writeFile(path, initialCode, {
      encoding: "utf-8",
    });
  }, [initialCode, webContainer, id]);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grow min-w-0 max-h-[200px] overflow-auto rounded border border-stone-200/70">
        <ReactCodeMirror
          value={code}
          onChange={onCodeChange}
          extensions={extensions}
          theme={"light"}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
          }}
        />
      </div>
      <div className="grow overflow-hidden min-w-0 rounded border border-stone-200/70">
        <ReactCodeMirror
          value={render}
          onChange={onRenderChange}
          extensions={extensions}
          theme={"light"}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
          }}
        />
      </div>
      <RenderReactIframe id={id} code={code} render={render} />
    </div>
  );
}
