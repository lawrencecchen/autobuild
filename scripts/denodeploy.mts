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

// 3.) Deploy a "hello world" server to the new project
const dr = await fetch(`${API}/projects/${project.id}/deployments`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    entryPointUrl: "main.ts",
    assets: {
      "main.ts": {
        kind: "file",
        content: `Deno.serve(() => new Response("Hello, World!"));`,
        encoding: "utf-8",
      },
    },
    envVars: {},
  }),
});
console.log(dr.status);
const deployment = await dr.json();
console.log("Deployment created:", deployment);

const previewUrl = `https://${project.name}-${deployment.id}.deno.dev`;
console.log("Preview URL:", previewUrl);
