"use server";
import {
  type Project,
  createDenoDeployDeployment,
} from "@/lib/deploy/createDenoDeployEndpoint";

export async function createDeployment({
  code,
  project,
}: {
  code: string;
  project: Project;
}) {
  "use server";
  const newDeployment = await createDenoDeployDeployment({
    assets: {
      "handler.ts": {
        kind: "file",
        encoding: "utf-8",
        content: code,
      },
    },
    envVars: {},
    project,
  });
  return newDeployment;
}

export type Deployment = Awaited<ReturnType<typeof createDeployment>>;
