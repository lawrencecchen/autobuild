import { EditorView } from "@codemirror/view";
import { useCallback, useMemo, useState } from "react";
import { javascript } from "@codemirror/lang-javascript";
import ReactCodeMirror from "@uiw/react-codemirror";

export function RenderReact({
  code: initialCode,
  render: initialRender,
}: {
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
  const onCodeChange = useCallback((value: string) => {
    setCode(value);
  }, []);
  const onRenderChange = useCallback((value: string) => {
    setRender(value);
  }, []);
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
    </div>
  );
}
