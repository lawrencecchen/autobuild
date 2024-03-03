"use client";
import ReactCodeMirror, { oneDark } from "@uiw/react-codemirror";
import { sql as sqlExtension } from "@codemirror/lang-sql";
import { Button } from "../ui/button";

export function RunSQL({
  sql,
  params,
}: {
  sql: string;
  params?: Array<string>;
}) {
  return (
    <div className="flex flex-col">
      <div className="grow">
        <ReactCodeMirror
          value={sql}
          extensions={[sqlExtension()]}
          theme={oneDark}
        />
      </div>
      <Button size="sm">Run query</Button>
    </div>
  );
}
