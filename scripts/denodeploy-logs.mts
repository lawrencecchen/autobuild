const accessToken = process.env.DENO_DEPLOY_ACCESS_TOKEN;
const orgId = process.env.DENO_DEPLOY_ORG_ID;
const API = "https://api.deno.com/v1";
const headers = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};

async function getDeploymentLogs(
  deploymentId: string,
  since?: string,
  until?: string,
  realTime: boolean = false
): Promise<any> {
  let url = new URL(API + `/deployments/${deploymentId}/app_logs`);

  // Add query parameters for past logs
  if (since) url.searchParams.append("since", since);
  if (until) url.searchParams.append("until", until);

  // Set headers
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${accessToken}`);

  // Decide the Accept header based on realTime flag
  if (realTime) {
    headers.set("Accept", "application/x-ndjson");
  } else {
    headers.set("Accept", "application/json");
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: headers,
    });
    console.log(1);

    if (!response.ok) {
      throw new Error(`Error fetching logs: ${response.statusText}`);
    }

    // Parse response based on the Accept header
    if (realTime) {
      if (!response.body) {
        throw new Error("Response body is undefined");
      }
      // Handle stream for real-time logs
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // Process each chunk (assuming text stream for simplicity)
        console.log(new TextDecoder().decode(value));
      }
    } else {
      // Parse JSON array for past logs
      const logs = await response.json();
      return logs;
    }
  } catch (error) {
    console.error("Failed to fetch deployment logs:", error);
  }
}
const result = await getDeploymentLogs("fng02ykz13mh", "2022-01-01T00:00:00Z");
console.log(result);
