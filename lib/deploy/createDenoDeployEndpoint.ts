import { unstable_noStore as noStore } from "next/cache";
import { corsProgram } from "./corsProgram";

export type Asset = {
  kind: "file";
  encoding: "utf-8";
  content: string;
};
export type Assets = Record<string, Asset>;

export type Project = {
  id: string;
  name: string;
};

// https://apidocs.deno.com/#get-/deployments/-deploymentId-
export type Deployment = {
  id: string;
  projectId: string;
  description: string;
  status: string;
};

const accessToken = process.env.DENO_DEPLOY_ACCESS_TOKEN;
const orgId = process.env.DENO_DEPLOY_ORG_ID;
const API = "https://api.deno.com/v1";
const headers = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};

export async function createProject() {
  // 2.) Create a new project
  const pr = await fetch(`${API}/organizations/${orgId}/projects`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: null, // randomly generates project name
    }),
  });
  const project = (await pr.json()) as Project;
  return project;
}

export async function createDenoDeployDeployment({
  assets,
  envVars,
  project,
}: {
  assets: Assets;
  envVars: Record<string, string>;
  project: Project;
}) {
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
import cors from "./cors.ts";

Deno.serve(async (req) => cors(req, await handler(req)));`,
        },
        "cors.ts": {
          kind: "file",
          encoding: "utf-8",
          content: corsProgram,
        },
        ...assets,
      },
      envVars,
    }),
  });
  const deployment = (await dr.json()) as Deployment;
  const url = `https://${project.name}-${deployment.id}.deno.dev`;
  return { url, deployment, project };
}

export async function getDeploymentDetails(deploymentId: string) {
  noStore();
  const dr = await fetch(`${API}/deployments/${deploymentId}`, {
    headers,
  });
  const deployment = await dr.json();
  return deployment as Deployment;
}

export async function* streamDeploymentLogs(
  deploymentId: string
): AsyncGenerator<{ level: string; message: string }> {
  let url = new URL(API + `/deployments/${deploymentId}/build_logs`);
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Accept", "application/x-ndjson");

  const textDecoder = new TextDecoder();
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      console.error(await response.text());
      throw new Error(`Error fetching logs: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Response body is undefined");
    }
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = textDecoder.decode(value);
      const parsed = text
        .split("\n")
        .filter(Boolean)
        .map((x) => JSON.parse(x));
      for (const log of parsed) {
        yield log;
      }
    }
  } catch (error) {
    console.error("Failed to fetch deployment logs:", error);
  }
}
