import { streamDeploymentLogs } from "../lib/deploy/createDenoDeployEndpoint";

for await (const log of streamDeploymentLogs("n87s9srbeewc")) {
  console.log("log", log);
}
