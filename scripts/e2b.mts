import { Sandbox } from "e2b";

try {
  const now = performance.now();
  console.log("Starting sandbox...");
  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY });
  console.log("Sandbox opened in", performance.now() - now, "ms");
  const result = await sandbox.process.startAndWait("node --version");
  console.log(result);
  console.log(await sandbox.process.startAndWait("python3 --version"));
  await sandbox.close();
} catch (e) {
  console.error(e);
}
