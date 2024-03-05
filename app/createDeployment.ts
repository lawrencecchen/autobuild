"use server";
import {
  createDenoDeployDeployment,
  streamDeploymentLogs,
  type Project,
} from "@/lib/deploy/createDenoDeployEndpoint";

export async function createAndWaitDeployment({
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
  await new Promise((resolve) => setTimeout(resolve, 500));
  for await (const log of streamDeploymentLogs(newDeployment.deployment.id)) {
    if (log.level === "info" && log.message.startsWith("Deployed to")) {
      break;
    }
  }
  return newDeployment;
}

export type CreateDeploymentResponse = Awaited<
  ReturnType<typeof createAndWaitDeployment>
>;
