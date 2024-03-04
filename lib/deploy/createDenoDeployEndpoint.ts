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
      },
      envVars,
    }),
  });
  const deployment = await dr.json();
  const url = `https://${project.name}-${deployment.id}.deno.dev`;
  return { url, deployment };
}
