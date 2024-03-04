export const queryDatabaseProgram = `\
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
}) => Promise<QueryDbResponse<any>>;`;
