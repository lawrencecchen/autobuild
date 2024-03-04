export type Asset = {
  kind: "file";
  encoding: "utf-8";
  content: string;
};
export type Assets = Record<string, Asset>;
export async function createDenoDeployEndpoint({
  assets,
  envVars,
}: {
  assets: Assets;
  envVars: Record<string, string>;
}) {
  const accessToken = process.env.DENO_DEPLOY_ACCESS_TOKEN;
  const orgId = process.env.DENO_DEPLOY_ORG_ID;
  const API = "https://api.deno.com/v1";
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  // 2.) Create a new project
  const pr = await fetch(`${API}/organizations/${orgId}/projects`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: null, // randomly generates project name
    }),
  });
  const project = await pr.json();
  // 3.) Deploy a "hello world" server to the new project
  const dr = await fetch(`${API}/projects/${project.id}/deployments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      entryPointUrl: "main.ts",
      assets: {
        "main.ts": {
          kind: "file",
          encoding: "utf-8",
          content: `\
import handler from "./handler.ts";
Deno.serve(handler);`,
        },
        ...assets,
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
    sql: "SELECT * FROM Customer",
    params: [],
  });
  return Response.json(result);
  // return Response.json({ ok: true })
}
`,
        },
        "db.ts": {
          kind: "file",
          encoding: "utf-8",
          content: `\
type QueryDbResponse<T> = {
  errors: {
    code: number;
    message: string;
  }[];
  messages: string[];
  result: [{ results: T[] }];
  success: boolean;
};

export async function queryDatabase<T>({
  databaseIdentifier,
  sql,
  params,
  accountIdentifier,
  bearerToken,
}: {
  databaseIdentifier: string;
  sql: string;
  params: unknown[];
  accountIdentifier?: string;
  bearerToken?: string;
}): Promise<QueryDbResponse<T>> {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${bearerToken}\`,
    },
    body: JSON.stringify({ sql, params }),
  };

  const url = \`https://api.cloudflare.com/client/v4/accounts/\${accountIdentifier}/d1/database/\${databaseIdentifier}/query\`;

  return fetch(url, options).then(
    (response) => response.json() as Promise<QueryDbResponse<T>>
  );
}
export type QueryDatabaseFunction = typeof queryDatabase;
export type RunQueryFunction = (input: {
  sql: string;
  params: unknown[];
}) => Promise<QueryDbResponse<any>>;`,
        },
      },
      envVars,
    }),
  });
  const deployment = await dr.json();
  const previewUrl = `https://${project.name}-${deployment.id}.deno.dev`;
  return { previewUrl, deployment };
}
