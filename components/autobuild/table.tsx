"use client";

import {
  DataEditor,
  GridCellKind,
  type GridCell,
  type GridColumn,
  type Item,
  type EditableGridCell,
  type GridSelection,
  CompactSelection,
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import { useCallback, useEffect, useState } from "react";
// import { useTableSize } from "./useTableSize";
import { useElementSize } from "@mantine/hooks";

function useTableSize() {
  const { height, width, ref: containerRef } = useElementSize();
  const elementSize = { height, width };

  return [containerRef, elementSize] as const;
}

type TableProps = {
  columns: GridColumn[];
  data: Array<Record<string, unknown>>;
  onGridSelectionChange?: (selection: GridSelection) => void;
};

function getData(
  data: Array<Record<string, unknown>>,
  columns: Array<GridColumn>
) {
  return ([iCol, iRow]: Item): GridCell => {
    const row = data[iRow];
    if (!row) {
      console.error("Row index out of range", data, columns, iCol, iRow);
      throw new Error("Row index out of range");
    }
    if (iCol < columns.length) {
      const column = columns[iCol];
      if (!column) {
        throw new Error("Column index out of range");
      }
      const key = column.id;
      if (!key) {
        throw new Error("Column key is undefined");
      }
      const data = row[key];
      if (typeof data === "string" && data.startsWith("http")) {
        return {
          kind: GridCellKind.Uri,
          data: data,
          allowOverlay: true,
          displayData: data,
          readonly: false,
        };
      }
      if (String(data) === "[object Object]") {
        const json = JSON.stringify(data);
        return {
          kind: GridCellKind.Text,
          data: json,
          allowOverlay: true,
          displayData: json,
          readonly: false,
        };
      }
      return {
        kind: GridCellKind.Text,
        data: String(data) || "",
        allowOverlay: true,
        displayData: String(data) || "",
        readonly: false,
      };
    } else {
      throw new Error("Column index out of range");
    }
  };
}

export function Table({
  columns: initialColumns,
  data,
  onGridSelectionChange: _onGridSelectionChange,
}: TableProps) {
  const [containerRef, { width: containerWidth, height: containerHeight }] =
    useTableSize();
  const [columns, setColumns] = useState(initialColumns);
  // update columns when initialColumns changes
  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);
  const onCellEdited = useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      if (newValue.kind !== GridCellKind.Text) {
        // we only have text cells, might as well just die here.
        return;
      }
      const [iCol, iRow] = cell;
      const row = data[iRow];
      if (!row) {
        throw new Error("Row index out of range");
      }
      // get key based off of column index
      const key = columns[iCol]?.id;
      if (!key) {
        throw new Error("Column key is undefined");
      }
      row[key] = newValue.data;
    },
    [columns, data]
  );

  const onColumnResize = useCallback(
    (_column: GridColumn, newSize: number, colIndex: number) => {
      setColumns((columns) =>
        columns.map((col, index) => {
          if (index === colIndex) {
            return { ...col, width: newSize };
          }
          return col;
        })
      );
    },
    []
  );
  const handleAppendRow = useCallback(async () => {
    console.log("new row appended!");
    // shift all of the existing cells down
    // for (let y = numRows; y > 0; y--) {
    //   for (let x = 0; x < 6; x++) {
    //     setCellValueRaw([x, y], getCellContent([x, y - 1]));
    //   }
    // }
    // for (let c = 0; c < 6; c++) {
    //   const cell = getCellContent([c, 0]);
    //   setCellValueRaw([c, 0], clearCell(cell));
    // }
    // setNumRows((cv) => cv + 1);
    return "top" as const;
  }, []);
  const [selection, setSelection] = useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  });
  const onGridSelectionChange = useCallback(
    (selection: GridSelection) => {
      setSelection(selection);
      _onGridSelectionChange?.(selection);
    },
    [setSelection, _onGridSelectionChange]
  );

  return (
    <div ref={containerRef} className="relative min-w-0 grow">
      {/* absolute to make parent resize which will propagate to DataEditor width/height props */}
      <div className="absolute inset-0">
        <DataEditor
          rowMarkers="both"
          theme={{
            headerFontStyle: "600 13px",
            baseFontStyle: "13px",
            lineHeight: 10,
            // cellVerticalPadding: "30px",
            // bgHeaderHasFocus: "red",
            // textHeaderSelected: "Red",
            // bgBubbleSelected: "red",
            // cellHorizontalPadding: 2,
          }}
          overscrollX={120}
          smoothScrollX
          smoothScrollY
          rowSelectionMode="multi"
          width={containerWidth}
          height={containerHeight}
          columns={columns}
          getCellContent={getData(data, columns)}
          rows={data.length}
          onCellEdited={onCellEdited}
          onColumnResize={onColumnResize}
          // trailingRowOptions={{
          //   hint: "New row...",
          //   sticky: true,
          //   tint: true,
          // }}
          onRowAppended={handleAppendRow}
          rowHeight={30}
          headerHeight={30}
          gridSelection={selection}
          onGridSelectionChange={onGridSelectionChange}
        />
      </div>
    </div>
  );
}
