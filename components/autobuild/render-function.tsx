"use client";
import { type AI } from "@/app/action";
import {
  CreateDeploymentResponse,
  createAndWaitDeployment,
} from "@/app/createDeployment";
import { type Project } from "@/lib/deploy/createDenoDeployEndpoint";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import { PlayIcon } from "@radix-ui/react-icons";
import { useMutation } from "@tanstack/react-query";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useAIState } from "ai/rsc";
import { Loader } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { spinner } from "../llm-stocks";
import { Button } from "../ui/button";

type Preview = {
  type: "json";
  data: any;
};
function Preview({ preview }: { preview: Preview }) {
  const extensions = useMemo(
    () => [
      javascript(),
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
  if (preview.type === "json") {
    return (
      <div className="grow overflow-hidden min-w-0 rounded border border-stone-200/70">
        <ReactCodeMirror
          value={JSON.stringify(preview.data, null, 2)}
          extensions={extensions}
          theme={"light"}
        />
      </div>
    );
  }
  return <div>Unknown preview type</div>;
}

export function RenderFunction({
  code: initialCode,
  save,
  queryKey,
  project,
  initialDeployments,
}: {
  code: string;
  save: ({
    code,
    project,
  }: {
    code: string;
    project: Project;
  }) => Promise<void>;
  queryKey: string;
  project: Project;
  initialDeployments: CreateDeploymentResponse[];
}) {
  const [latestDeploymentCode, setLatestDeploymentCode] = useState(initialCode);
  const [deployments, setDeployments] = useState(initialDeployments);
  const latestDeployment = deployments[deployments.length - 1];
  const endpointUrl = latestDeployment?.url;
  const [aiState, setAIState] = useAIState<typeof AI>();
  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState<Preview>();

  const runMutation = useMutation({
    mutationFn: async ({
      endpointUrl,
      shouldCreateNewDeployment,
    }: {
      endpointUrl: string;
      shouldCreateNewDeployment: boolean;
    }) => {
      if (shouldCreateNewDeployment) {
        const newDeployment = await createAndWaitDeployment({ code, project });
        endpointUrl = newDeployment.url;
        setDeployments((current) => [...current, newDeployment]);
        setLatestDeploymentCode(code);
      }
      const response = await fetch(endpointUrl, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        console.error(await response.text());
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      setPreview({ type: "json", data });
      return data;
    },
    onSuccess(newData) {},
  });
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
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-2">
        <div className="flex items-center">
          <div className="text-sm font-mono">{queryKey}</div>
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          {endpointUrl ? (
            <a
              href={endpointUrl}
              target="_blank"
              className="text-xs font-mono max-w-[220px] truncate"
            >
              {endpointUrl}
            </a>
          ) : (
            <>
              <div className="text-xs">Deploying code</div>
              {spinner}
            </>
          )}
          <Button
            size="sm"
            variant="default"
            className="text-sm gap-2"
            disabled={runMutation.isPending || !endpointUrl}
            onClick={() => {
              if (!endpointUrl) {
                return;
              }
              const shouldCreateNewDeployment = code !== latestDeploymentCode;
              runMutation.mutate({ endpointUrl, shouldCreateNewDeployment });
            }}
          >
            {runMutation.isPending || !endpointUrl ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
            Run
          </Button>
        </div>
      </div>
      <div className="grow overflow-hidden min-w-0 rounded border border-stone-200/70">
        <ReactCodeMirror
          value={code}
          onChange={onCodeChange}
          extensions={extensions}
          // theme={oneDark}
          theme={"light"}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
          }}
        />
      </div>
      {preview && <Preview preview={preview} />}
    </div>
  );
}
