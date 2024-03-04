"use client";
import { RunQueryFunction } from "@/app/queryD1Db";
import { sql as sqlExtension } from "@codemirror/lang-sql";
import { EditorView } from "@codemirror/view";
import { useMutation } from "@tanstack/react-query";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useCallback, useId, useMemo, useState } from "react";
import { spinner } from "../llm-stocks";
import { Button } from "../ui/button";
import { Table } from "./table";
import { useAIState } from "ai/rsc";
import { type AI } from "@/app/action";
import { GridSelection } from "@glideapps/glide-data-grid";
import { PlayIcon } from "@radix-ui/react-icons";
import { Loader } from "lucide-react";
import clsx from "clsx";

export function RunSQL({
  sql: initialSql,
  params: initialParams,
  runQuery,
  initialData,
  isInitialDataLoading,
  endpointUrl,
  queryKey,
}: {
  sql: string;
  params?: Array<string>;
  runQuery: RunQueryFunction;
  initialData?: any;
  isInitialDataLoading: boolean;
  endpointUrl?: string;
  queryKey: string;
}) {
  const [aiState, setAIState] = useAIState<typeof AI>();
  const [sql, setSql] = useState(initialSql);
  const [params, setParams] = useState(JSON.stringify(initialParams ?? []));
  const [data, setData] = useState(initialData);
  const runQueryMutation = useMutation({
    mutationFn: runQuery,
    onSuccess(newData) {
      setData(newData);
    },
  });
  const rows = data?.result?.[0].results;
  const columns = Object.keys(rows?.[0] ?? {}).map((key) => ({
    title: key,
    id: key,
    width: 200,
  }));
  const id = useId();
  const extensions = useMemo(
    () => [
      sqlExtension(),
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
  const onSqlChange = useCallback((value: string) => {
    setSql(value);
  }, []);
  const onParamsChange = useCallback((value: string) => {
    setParams(value);
  }, []);
  const onGridSelectionChange = useCallback(
    (selection: GridSelection) => {
      const selectedRowsIndices = selection.rows.toArray();
      const selectedRows = selectedRowsIndices.map((index) => rows[index]);
      if (selectedRows.length > 0) {
        const info = {
          role: "assistant" as const,
          content: `[User has selected the following rows: ${selectedRows.map(
            (row) => JSON.stringify(row)
          )}]`,
          // Identifier of this UI component, so we don't insert it many times.
          id,
        };
        if (aiState[aiState.length - 1]?.id === id) {
          setAIState([...aiState.slice(0, -1), info]);
        } else {
          // If it doesn't exist, append it to the AI state.
          setAIState([...aiState, info]);
        }
      } else {
        // remove the info from the AI state
        setAIState(aiState.filter((info) => info.id !== id));
      }
    },
    [aiState, id, rows, setAIState]
  );
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-2">
        <div className="flex items-center">
          <div className="text-sm font-mono">{queryKey}</div>
        </div>
        <div className="flex items-center gap-2 justify-end">
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
              <div className="text-xs">Creating endpoint URL</div>
              {spinner}
            </>
          )}
          <Button
            size="sm"
            variant="default"
            className="text-sm gap-2"
            disabled={runQueryMutation.isPending}
            onClick={() => {
              runQueryMutation.mutate({ sql, params: JSON.parse(params) });
            }}
          >
            {runQueryMutation.isPending ? (
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
          value={sql}
          onChange={onSqlChange}
          extensions={extensions}
          // theme={oneDark}
          theme={"light"}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
          }}
        />
      </div>
      <div className="grow overflow-hidden min-w-0 rounded border border-stone-200/70">
        <ReactCodeMirror
          value={params}
          onChange={onParamsChange}
          // theme={oneDark}
          theme={"light"}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
          }}
        />
      </div>
      {isInitialDataLoading && (
        <div className="flex items-center gap-2">
          <div className="text-sm">Loading data...</div>
          <Loader className="w-4 h-4 animate-spin" />
        </div>
      )}
      {rows && columns && (
        <div
          className={clsx("flex min-h-[280px] flex-col transition", {
            "opacity-50": runQueryMutation.isPending,
          })}
        >
          <div className="flex grow overflow-hidden rounded border border-stone-200/70">
            <Table
              data={rows}
              columns={columns}
              onGridSelectionChange={onGridSelectionChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
