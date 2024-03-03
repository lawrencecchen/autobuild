"use client";
import { RunQueryFunction } from "@/app/queryD1Db";
import { sql as sqlExtension } from "@codemirror/lang-sql";
import { EditorView } from "@codemirror/view";
import { useMutation } from "@tanstack/react-query";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useCallback, useMemo, useState } from "react";
import { spinner } from "../llm-stocks";
import { Button } from "../ui/button";
import { Table } from "./table";

export function RunSQL({
  sql: initialSql,
  params: initialParams,
  runQuery,
  initialData,
}: {
  sql: string;
  params?: Array<string>;
  runQuery: RunQueryFunction;
  initialData?: any;
}) {
  const [sql, setSql] = useState(initialSql);
  const [params, setParams] = useState(JSON.stringify(initialParams ?? []));
  const [data, setData] = useState(initialData);
  const runQueryMutation = useMutation({
    mutationFn: runQuery,
    onSuccess(newData) {
      console.log("setting data", newData);
      setData(newData);
    },
  });
  const rows = data?.result?.[0].results;
  const columns = Object.keys(rows?.[0] ?? {}).map((key) => ({
    title: key,
    id: key,
    width: 200,
  }));
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
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grow overflow-hidden rounded">
        <ReactCodeMirror
          value={sql}
          onChange={onSqlChange}
          extensions={extensions}
          // theme={oneDark}
          theme={"light"}
        />
      </div>
      <div className="grow overflow-hidden rounded">
        <ReactCodeMirror
          value={params}
          onChange={onParamsChange}
          // theme={oneDark}
          theme={"light"}
        />
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={runQueryMutation.isPending}
        onClick={() => {
          runQueryMutation.mutate({ sql, params: JSON.parse(params) });
        }}
      >
        Run query
        {runQueryMutation.isPending && spinner}
      </Button>
      {rows && columns && (
        <div className="flex min-h-[280px] flex-col">
          <div className="flex grow overflow-hidden rounded border border-stone-200/70">
            <Table data={rows} columns={columns} />
          </div>
        </div>
      )}
    </div>
  );
}
