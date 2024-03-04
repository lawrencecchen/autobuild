import fs from "node:fs";

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
console.log("Project created:", project);

const queryDbProgram = fs.readFileSync("app/queryD1Db.ts", "utf-8");

// 3.) Deploy a "hello world" server to the new project
const dr = await fetch(`${API}/projects/${project.id}/deployments`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    entryPointUrl: "main.ts",
    assets: {
      "main.ts": {
        kind: "file",
        // content: `Deno.serve(() => new Response("Hello, World!"));`,
        content: `\
import { queryDatabase } from "./db.ts";

Deno.serve(async (req) => {
  const result = await queryDatabase({
    databaseIdentifier: "61495fe1-331e-41e4-b235-f7672ca1b5c5",
    cloudflareApiToken: Deno.env.get("CLOUDFLARE_API_TOKEN"),
    accountIdentifier: Deno.env.get("CLOUDFLARE_ACCOUNT_ID"),
    sql: "SELECT * FROM Customer",
    params: [],
  });
  return Response.json(result);
})
`,
        encoding: "utf-8",
      },
      "db.ts": {
        kind: "file",
        content: queryDbProgram,
        encoding: "utf-8",
      },
    },
    envVars: {
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
    },
  }),
});
console.log(dr.status);
const deployment = await dr.json();
console.log("Deployment created:", deployment);

const previewUrl = `https://${project.name}-${deployment.id}.deno.dev`;
console.log("Preview URL:", previewUrl);
