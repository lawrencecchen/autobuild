import "server-only";

import { createAI, createStreamableUI, getMutableAIState } from "ai/rsc";
import OpenAI from "openai";
import { format } from "sql-formatter";

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase,
  Stocks,
  Events,
} from "@/components/llm-stocks";

import {
  runAsyncFnWithoutBlocking,
  sleep,
  formatNumber,
  runOpenAICompletion,
} from "@/lib/utils";
import { z } from "zod";
import { StockSkeleton } from "@/components/llm-stocks/stock-skeleton";
import { EventsSkeleton } from "@/components/llm-stocks/events-skeleton";
import { StocksSkeleton } from "@/components/llm-stocks/stocks-skeleton";
import { queryDatabase } from "./queryD1Db";
import { isQuerySafe as getIsQuerySafe } from "./isQuerySafe";
import { RunSQL, Table } from "@/components/db";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

async function getDatabaseSchema({
  databaseIdentifier,
  cloudflareApiToken,
  accountIdentifier,
}: {
  databaseIdentifier: string;
  cloudflareApiToken: string;
  accountIdentifier: string;
}) {
  type TableInfo = {
    type: "table";
    name: string;
    tbl_name: string;
    rootpage: number;
    sql: string;
  };
  const result = await queryDatabase<TableInfo>({
    databaseIdentifier: databaseIdentifier,
    sql: "SELECT * FROM sqlite_schema WHERE type = 'table'",
    params: [],
    accountIdentifier: accountIdentifier,
    bearerToken: cloudflareApiToken,
  });
  const ignoreTables = new Set(["_cf_KV"]);
  const tables = result.result?.[0]?.results?.filter(
    (table) => !ignoreTables.has(table.name)
  );
  const ddls = tables?.map((table) => table.sql);
  return ddls.join("\n");
}

async function confirmPurchase(symbol: string, price: number, amount: number) {
  "use server";

  const aiState = getMutableAIState<typeof AI>();

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  );

  const systemMessage = createStreamableUI(null);

  runAsyncFnWithoutBlocking(async () => {
    // You can update the UI at any point.
    await sleep(1000);

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    );

    await sleep(1000);

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{" "}
          {formatNumber(amount * price)}
        </p>
      </div>
    );

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={" "}
        {formatNumber(amount * price)}.
      </SystemMessage>
    );

    aiState.done([
      ...aiState.get(),
      {
        role: "system",
        content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${
          amount * price
        }]`,
      },
    ]);
  });

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: Date.now(),
      display: systemMessage.value,
    },
  };
}

async function submitUserMessage(content: string) {
  "use server";

  const aiState = getMutableAIState<typeof AI>();
  aiState.update([
    ...aiState.get(),
    {
      role: "user",
      content,
    },
  ]);

  const reply = createStreamableUI(
    <BotMessage className="items-center">{spinner}</BotMessage>
  );

  const databaseSchema = await getDatabaseSchema({
    databaseIdentifier: "61495fe1-331e-41e4-b235-f7672ca1b5c5",
    cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN!,
    accountIdentifier: process.env.CLOUDFLARE_ACCOUNT_ID!,
  });

  const completion = runOpenAICompletion(openai, {
    model: "gpt-3.5-turbo",
    stream: true,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `\
You are a database assistant. You can help users run SQL queries on the database.
You can run a read-only SQL query on the database using the \`run_sql\` function.
Use SQL parameters to prevent SQL injection attacks.
The database is a SQLite database. Use ? to specify parameters in the SQL query, and pass the parameters as an array to the \`run_sql\` function.

Database schema:

${databaseSchema}`,
      },
      ...aiState.get().map((info: any) => ({
        role: info.role,
        content: info.content,
        name: info.name,
      })),
    ],
    functions: [
      {
        name: "run_sql",
        description: "Run a read-only SQL query on the database.",
        parameters: z.object({
          sql: z.string().describe("The SQL query to run."),
          params: z
            .array(z.string())
            .optional()
            .describe("The parameters to use in the query."),
        }),
      },
    ],
  });

  //   const completion2 = runOpenAICompletion(openai, {
  //     model: "gpt-3.5-turbo",
  //     stream: true,
  //     messages: [
  //       {
  //         role: "system",
  //         content: `\
  // You are a stock trading conversation bot and you can help users buy stocks, step by step.
  // You and the user can discuss stock prices and the user can adjust the amount of stocks they want to buy, or place an order, in the UI.

  // Messages inside [] means that it's a UI element or a user event. For example:
  // - "[Price of AAPL = 100]" means that an interface of the stock price of AAPL is shown to the user.
  // - "[User has changed the amount of AAPL to 10]" means that the user has changed the amount of AAPL to 10 in the UI.

  // If the user requests purchasing a stock, call \`show_stock_purchase_ui\` to show the purchase UI.
  // If the user just wants the price, call \`show_stock_price\` to show the price.
  // If you want to show trending stocks, call \`list_stocks\`.
  // If you want to show events, call \`get_events\`.
  // If the user wants to sell stock, or complete another impossible task, respond that you are a demo and cannot do that.

  // Besides that, you can also chat with users and do some calculations if needed.`,
  //       },
  //       ...aiState.get().map((info: any) => ({
  //         role: info.role,
  //         content: info.content,
  //         name: info.name,
  //       })),
  //     ],
  //     functions: [
  //       {
  //         name: "show_stock_price",
  //         description:
  //           "Get the current stock price of a given stock or currency. Use this to show the price to the user.",
  //         parameters: z.object({
  //           symbol: z
  //             .string()
  //             .describe(
  //               "The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD."
  //             ),
  //           price: z.number().describe("The price of the stock."),
  //           delta: z.number().describe("The change in price of the stock"),
  //         }),
  //       },
  //       {
  //         name: "show_stock_purchase_ui",
  //         description:
  //           "Show price and the UI to purchase a stock or currency. Use this if the user wants to purchase a stock or currency.",
  //         parameters: z.object({
  //           symbol: z
  //             .string()
  //             .describe(
  //               "The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD."
  //             ),
  //           price: z.number().describe("The price of the stock."),
  //           numberOfShares: z
  //             .number()
  //             .describe(
  //               "The **number of shares** for a stock or currency to purchase. Can be optional if the user did not specify it."
  //             ),
  //         }),
  //       },
  //       {
  //         name: "list_stocks",
  //         description: "List three imaginary stocks that are trending.",
  //         parameters: z.object({
  //           stocks: z.array(
  //             z.object({
  //               symbol: z.string().describe("The symbol of the stock"),
  //               price: z.number().describe("The price of the stock"),
  //               delta: z.number().describe("The change in price of the stock"),
  //             })
  //           ),
  //         }),
  //       },
  //       {
  //         name: "get_events",
  //         description:
  //           "List funny imaginary events between user highlighted dates that describe stock activity.",
  //         parameters: z.object({
  //           events: z.array(
  //             z.object({
  //               date: z
  //                 .string()
  //                 .describe("The date of the event, in ISO-8601 format"),
  //               headline: z.string().describe("The headline of the event"),
  //               description: z.string().describe("The description of the event"),
  //             })
  //           ),
  //         }),
  //       },
  //     ],
  //     temperature: 0,
  //   });
  let lastAssistantContent = "";

  completion.onTextContent((content: string, isFinal: boolean) => {
    lastAssistantContent = content.split(`{"function_call"`)[0];
    reply.update(<BotMessage>{lastAssistantContent}</BotMessage>);
    if (isFinal) {
      reply.done();
      aiState.done([...aiState.get(), { role: "assistant", content }]);
    }
  });

  completion.onFunctionCall("run_sql", async ({ sql, params }) => {
    const isQuerySafe = getIsQuerySafe(sql);
    sql = format(sql, { language: "sqlite" });
    async function runQuery({
      sql,
      params,
    }: {
      sql: string;
      params: unknown[];
    }) {
      "use server";
      const result = await queryDatabase<any>({
        databaseIdentifier: "61495fe1-331e-41e4-b235-f7672ca1b5c5",
        accountIdentifier: process.env.CLOUDFLARE_ACCOUNT_ID!,
        bearerToken: process.env.CLOUDFLARE_API_TOKEN!,
        sql,
        params,
      });
      return result;
    }
    reply.update(
      <>
        {lastAssistantContent && (
          <BotMessage>{lastAssistantContent}</BotMessage>
        )}
        <BotCard>
          <RunSQL sql={sql} params={params} runQuery={runQuery} />
        </BotCard>
      </>
    );
    const result = isQuerySafe
      ? await queryDatabase<any>({
          databaseIdentifier: "61495fe1-331e-41e4-b235-f7672ca1b5c5",
          accountIdentifier: process.env.CLOUDFLARE_ACCOUNT_ID!,
          bearerToken: process.env.CLOUDFLARE_API_TOKEN!,
          sql,
          params,
        })
      : undefined;
    reply.update(
      <>
        {lastAssistantContent && (
          <BotMessage>{lastAssistantContent}</BotMessage>
        )}
        <BotCard>
          <RunSQL
            sql={sql}
            params={params}
            runQuery={runQuery}
            initialData={result}
          />
        </BotCard>
      </>
    );

    function toCSV(json: any) {
      const keys = Object.keys(json[0]);
      let csv = keys.map((key) => key).join(",");
      json.forEach((row: any) => {
        const values = keys.map((key) => row[key]);
        csv += "\n" + values.join(",");
      });
      return csv;
    }

    const formattedResult = result
      ? result.errors.length > 0
        ? "Errors:\n" + result.errors.map((x) => JSON.stringify(x)).join("\n\n")
        : "First 5 rows:\n" + toCSV(result.result[0].results.slice(0, 5))
      : "Waiting for user to execute query.";

    aiState.done([
      ...aiState.get(),
      {
        role: "function",
        name: "show_run_sql",
        content: `[SQL = ${sql}, params = ${JSON.stringify(params)}, result = ${formattedResult}]`,
      },
    ]);
  });

  completion.onFunctionCall("list_stocks", async ({ stocks }) => {
    reply.update(
      <BotCard>
        <StocksSkeleton />
      </BotCard>
    );

    await sleep(1000);

    reply.done(
      <BotCard>
        <Stocks stocks={stocks} />
      </BotCard>
    );

    aiState.done([
      ...aiState.get(),
      {
        role: "function",
        name: "list_stocks",
        content: JSON.stringify(stocks),
      },
    ]);
  });

  completion.onFunctionCall("get_events", async ({ events }) => {
    reply.update(
      <BotCard>
        <EventsSkeleton />
      </BotCard>
    );

    await sleep(1000);

    reply.done(
      <BotCard>
        <Events events={events} />
      </BotCard>
    );

    aiState.done([
      ...aiState.get(),
      {
        role: "function",
        name: "list_stocks",
        content: JSON.stringify(events),
      },
    ]);
  });

  completion.onFunctionCall(
    "show_stock_price",
    async ({
      symbol,
      price,
      delta,
    }: {
      symbol: string;
      price: number;
      delta: number;
    }) => {
      reply.update(
        <BotCard>
          <StockSkeleton />
        </BotCard>
      );

      await sleep(1000);

      reply.done(
        <BotCard>
          <Stock name={symbol} price={price} delta={delta} />
        </BotCard>
      );

      aiState.done([
        ...aiState.get(),
        {
          role: "function",
          name: "show_stock_price",
          content: `[Price of ${symbol} = ${price}]`,
        },
      ]);
    }
  );

  completion.onFunctionCall(
    "show_stock_purchase_ui",
    ({
      symbol,
      price,
      numberOfShares = 100,
    }: {
      symbol: string;
      price: number;
      numberOfShares?: number;
    }) => {
      if (numberOfShares <= 0 || numberOfShares > 1000) {
        reply.done(<BotMessage>Invalid amount</BotMessage>);
        aiState.done([
          ...aiState.get(),
          {
            role: "function",
            name: "show_stock_purchase_ui",
            content: `[Invalid amount]`,
          },
        ]);
        return;
      }

      reply.done(
        <>
          <BotMessage>
            Sure!{" "}
            {typeof numberOfShares === "number"
              ? `Click the button below to purchase ${numberOfShares} shares of $${symbol}:`
              : `How many $${symbol} would you like to purchase?`}
          </BotMessage>
          <BotCard showAvatar={false}>
            <Purchase
              defaultAmount={numberOfShares}
              name={symbol}
              price={+price}
            />
          </BotCard>
        </>
      );
      aiState.done([
        ...aiState.get(),
        {
          role: "function",
          name: "show_stock_purchase_ui",
          content: `[UI for purchasing ${numberOfShares} shares of ${symbol}. Current price = ${price}, total cost = ${
            numberOfShares * price
          }]`,
        },
      ]);
    }
  );

  return {
    id: Date.now(),
    display: reply.value,
  };
}

// Define necessary types and create the AI.

const initialAIState: {
  role: "user" | "assistant" | "system" | "function";
  content: string;
  id?: string;
  name?: string;
}[] = [];

const initialUIState: {
  id: number;
  display: React.ReactNode;
}[] = [];

export const AI = createAI({
  actions: {
    submitUserMessage,
    confirmPurchase,
  },
  initialUIState,
  initialAIState,
});
