import { useWebContainer } from "@/lib/hooks/useWebContainer";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function convertToWebContainerUrl(
  creationId: string,
  webContainerUrl: string
): string {
  return `${webContainerUrl}/?c=${creationId}`;
}

function codeToRender({ code, render }: { code: string; render: string }) {
  return `\
${code}

export default function Preview() {
  return (
    <>
      ${render}
    </>
  );
}`;
}

function RenderReactIframe({ id }: { id: string }) {
  const { url: webContainerUrl } = useWebContainer();
  function getIframePreviewUrl() {
    if (webContainerUrl) {
      return convertToWebContainerUrl(id, webContainerUrl);
    }
    if (webContainerUrl) {
      return webContainerUrl;
    }
    return null;
  }
  const mainIframePreviewUrl = getIframePreviewUrl();
  const mainIframePreviewRef = useRef<HTMLIFrameElement>(null);
  if (!mainIframePreviewUrl) {
    return <div>Spawning sandbox...</div>;
  }
  return (
    <iframe
      className="w-full h-full grow"
      src={mainIframePreviewUrl}
      ref={mainIframePreviewRef}
    ></iframe>
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
    async (newCode: string) => {
      setCode(newCode);
      if (!webContainer) {
        return;
      }
      const path = createPath({ creationId: id });
      await webContainer.fs.writeFile(
        path,
        codeToRender({ code: newCode, render }),
        {
          encoding: "utf-8",
        }
      );
    },
    [id, render, webContainer]
  );
  const onRenderChange = useCallback(
    async (newRender: string) => {
      setRender(newRender);
      if (!webContainer) {
        return;
      }
      const path = createPath({ creationId: id });
      await webContainer.fs.writeFile(
        path,
        codeToRender({ code, render: newRender }),
        {
          encoding: "utf-8",
        }
      );
    },
    [webContainer, id, code]
  );
  useEffect(() => {
    if (!webContainer) {
      return;
    }
    const path = createPath({ creationId: id });
    void webContainer.fs.writeFile(
      path,
      codeToRender({ code: initialCode, render: initialRender }),
      {
        encoding: "utf-8",
      }
    );
  }, [initialCode, webContainer, id, initialRender]);
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
      <div className="border rounded min-h-[200px] overflow-hidden flex flex-col resize-y">
        <RenderReactIframe id={id} />
      </div>
    </div>
  );
}
