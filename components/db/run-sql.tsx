"use client";
import ReactCodeMirror, { oneDark } from "@uiw/react-codemirror";
import { sql as sqlExtension } from "@codemirror/lang-sql";
import { Button } from "../ui/button";
import { RunQueryFunction } from "@/app/queryD1Db";
import { useMutation } from "@tanstack/react-query";
import { Table } from "./table";
import { spinner } from "../llm-stocks";
import { useCallback, useMemo, useState } from "react";

export function RunSQL({
  sql: initialSql,
  params: initialParams,
  runQuery,
  initialData,
}: {
  sql: string;
  params: Array<string>;
  runQuery: RunQueryFunction;
  initialData?: any;
}) {
  const [sql, setSql] = useState(initialSql);
  const runQueryMutation = useMutation({
    mutationFn: runQuery,
  });
  const data = runQueryMutation.data ?? initialData;
  const rows = data?.result?.[0].results;
  const columns = Object.keys(rows?.[0] ?? {}).map((key) => ({
    title: key,
    id: key,
    width: 200,
  }));
  const extensions = useMemo(() => [sqlExtension()], []);
  const onChange = useCallback((value: string) => {
    setSql(value);
  }, []);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grow overflow-hidden rounded">
        <ReactCodeMirror
          value={sql}
          onChange={onChange}
          extensions={extensions}
          theme={oneDark}
        />
      </div>
      <Button
        size="sm"
        disabled={runQueryMutation.isPending}
        onClick={() => {
          runQueryMutation.mutate({ sql, params: initialParams });
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
