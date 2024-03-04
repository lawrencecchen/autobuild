import "server-only";

import { createAI, createStreamableUI, getMutableAIState } from "ai/rsc";
import OpenAI from "openai";
import { format } from "sql-formatter";

import {
  BotCard,
  BotMessage,
  Events,
  Purchase,
  Stock,
  Stocks,
  SystemMessage,
  spinner,
} from "@/components/llm-stocks";

import { RenderReact, RunSQL } from "@/components/autobuild";
import { EventsSkeleton } from "@/components/llm-stocks/events-skeleton";
import { StockSkeleton } from "@/components/llm-stocks/stock-skeleton";
import { StocksSkeleton } from "@/components/llm-stocks/stocks-skeleton";
import { createDenoDeployEndpoint } from "@/lib/deploy/createDenoDeployEndpoint";
import { queryDatabaseProgram } from "@/lib/deploy/programs";
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  runOpenAICompletion,
  sleep,
} from "@/lib/utils";
import { z } from "zod";
import { isQuerySafe as getIsQuerySafe } from "./isQuerySafe";
import { queryDatabase } from "./queryD1Db";

function escapeBackticks(s: string) {
  return s.replace(/`/g, "\\`");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  baseURL:
    "https://gateway.ai.cloudflare.com/v1/0c1675e0def6de1ab3a50a4e17dc5656/autobuild/openai",
});

function toCSV(json: any) {
  const keys = Object.keys(json[0]);
  let csv = keys.map((key) => key).join(",");
  json.forEach((row: any) => {
    const values = keys.map((key) => row[key]);
    csv += "\n" + values.join(",");
  });
  return csv;
}

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

async function submitUserMessage(content?: string) {
  "use server";

  const aiState = getMutableAIState<typeof AI>();
  if (content) {
    aiState.update([
      ...aiState.get(),
      {
        role: "user",
        content,
      },
    ]);
  }

  const reply = createStreamableUI(
    <BotMessage className="items-center">{spinner}</BotMessage>
  );

  const databaseSchema = await getDatabaseSchema({
    databaseIdentifier: "61495fe1-331e-41e4-b235-f7672ca1b5c5",
    cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN!,
    accountIdentifier: process.env.CLOUDFLARE_ACCOUNT_ID!,
  });

  const completion = runOpenAICompletion(openai, {
    model: "gpt-3.5-turbo-0125",
    // model: "gpt-4-0125-preview",
    stream: true,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `\
You are a Autobuild, a copilot that helps build internal tools. automate business processes, and discover business insights.
Autonomously use tools to fulfill user requests.
You can help users run SQL queries on the database.
You can run a read-only SQL query on the database using the \`run_sql\` function.
Use SQL parameters to prevent SQL injection attacks.
The database is a SQLite database. Use ? to specify parameters in the SQL query, and pass the parameters as an array to the \`run_sql\` function. Use backticks around table and column names.
You can also display a React component using the \`display_react\` function.
You may import \`@mui/material\` (v5.X.X) and use the components. Use Tailwind CSS for custom styling.
You may import \`useQuery\` from @tanstack/react-query (v4.X.X) and retrieve \`show_query\` results. Use the object syntax to pass the query key, query function, and other parameters.
You may import \`react-plotly.js\` (v2.X.X) and use the components to display plots.
Use ESNext syntax and write TypeScript.

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
          queryKey: z
            .string()
            .describe(
              "The query's key. React components will call useQuery({ queryKey: [queryKey, params] }) to access the result."
            ),
          sql: z.string().describe("The SQL query to run."),
          params: z
            .array(z.string())
            .optional()
            .describe("The parameters to use in the query."),
        }),
      },
      {
        name: "display_react",
        description: `Display a React component.`,
        parameters: z.object({
          code: z
            .string()
            .describe(
              `The code of the React component. Do not render or export it. Call \`useQuery\` to retrieve data to render. The queryKey should reference a queryKey defined in \`show_query\`, and the queryFn should fetch from the corresponding endpointURL.`
            ),
          render: z.string().describe("Render the components with props."),
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
    // lastAssistantContent = content.split(`{"function_call"`)[0];
    lastAssistantContent = content;
    reply.update(<BotMessage>{lastAssistantContent}</BotMessage>);
    if (isFinal) {
      reply.done();
      aiState.done([...aiState.get(), { role: "assistant", content }]);
    }
  });

  completion.onFunctionCall("run_sql", async ({ queryKey, sql, params }) => {
    const isQuerySafe = getIsQuerySafe(sql);
    sql = format(sql, { language: "sqlite" });
    if (!params) {
      params = [];
    }
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
          <RunSQL
            sql={sql}
            params={params}
            runQuery={runQuery}
            queryKey={queryKey}
            isInitialDataLoading={true}
          />
        </BotCard>
      </>
    );
    const endpoint = await createDenoDeployEndpoint({
      assets: {
        "db.ts": {
          kind: "file",
          encoding: "utf-8",
          content: queryDatabaseProgram,
        },
        "handler.ts": {
          kind: "file",
          encoding: "utf-8",
          // content: `Deno.serve(() => new Response("Hello, World!"));`,
          content: `\
import { queryDatabase } from "./db.ts";

export default async function handler(req: Request): Promise<Response> {
  const result = await queryDatabase({
    databaseIdentifier: "61495fe1-331e-41e4-b235-f7672ca1b5c5",
    bearerToken: Deno.env.get("CLOUDFLARE_API_TOKEN"),
    accountIdentifier: Deno.env.get("CLOUDFLARE_ACCOUNT_ID"),
    // sql: "SELECT * FROM Customer",
    sql: \`${escapeBackticks(sql)}\`,
    params: ${JSON.stringify(params)},
  });
  const errors = result.errors.map((x) => JSON.stringify(x)).join("\\n\\n");
  if (errors) {
    return Response.json({ errors });
  }
  return Response.json(result?.result?.[0]?.results);
  // return Response.json({ ok: true })
}`,
        },
      },
      envVars: {
        CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN!,
        CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID!,
      },
    });

    const result = isQuerySafe
      ? await queryDatabase<any>({
          databaseIdentifier: "61495fe1-331e-41e4-b235-f7672ca1b5c5",
          accountIdentifier: process.env.CLOUDFLARE_ACCOUNT_ID!,
          bearerToken: process.env.CLOUDFLARE_API_TOKEN!,
          sql,
          params,
        })
      : undefined;
    const initialError = result?.errors
      ? result.errors.map((x) => JSON.stringify(x)).join("\n\n")
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
            isInitialDataLoading={false}
            initialError={initialError}
            queryKey={queryKey}
            endpointUrl={endpoint.url}
          />
        </BotCard>
        {/* <Continue /> */}
      </>
    );

    const formattedResult = result
      ? result.errors.length > 0
        ? "Errors:\n" + result.errors.map((x) => JSON.stringify(x)).join("\n\n")
        : "First 5 rows:\n" + toCSV(result.result?.[0]?.results?.slice(0, 5))
      : "Waiting for user to execute query.";

    reply.done();
    aiState.done([
      ...aiState.get(),
      {
        role: "function",
        name: "show_query",
        // content: `[SQL = ${sql}, params = ${JSON.stringify(params)}, result = ${formattedResult}, queryKey = ${queryKey}, endpointUrl = ${endpoint.url}]`,
        content: JSON.stringify({
          sql,
          params,
          result: formattedResult,
          queryKey,
          endpointUrl: endpoint.url,
        }),
      },
    ]);
  });

  completion.onFunctionCall("display_react", async ({ code, render }) => {
    function preprocessReactCode(code: string) {
      // remove all default exports
      return code
        .split("\n")
        .filter((line) => !line.includes("export default"))
        .join("\n");
    }
    code = preprocessReactCode(code);
    const id = crypto.randomUUID();
    reply.update(
      <>
        {lastAssistantContent && (
          <BotMessage>{lastAssistantContent}</BotMessage>
        )}
        <BotCard>
          <RenderReact id={id} code={code} render={render} />
        </BotCard>
      </>
    );

    reply.done();
    aiState.done([
      ...aiState.get(),
      {
        role: "function",
        name: "display_react",
        content: JSON.stringify({ code, render }),
      },
    ]);
    // aiState.
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
