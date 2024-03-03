// TODO: Think about this more... can replace with a proper SQL parser or ensure read-only database access/role.

export function isQuerySafe(query: string): boolean {
  const disallowedKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "EXECUTE",
    "EXEC",
    "CREATE",
    "ALTER",
    "GRANT",
    "REVOKE",
    "TRUNCATE",
    "REPLACE",
  ];

  const trimmedQuery = query.trim().toUpperCase();

  // Check if the query starts with SELECT and does not contain any disallowed keywords
  if (!trimmedQuery.startsWith("SELECT")) {
    return false;
  }

  // Check for disallowed keywords
  for (const keyword of disallowedKeywords) {
    if (
      trimmedQuery.includes(` ${keyword} `) ||
      trimmedQuery.startsWith(`${keyword} `)
    ) {
      return false;
    }
  }

  // Allow a single trailing semicolon
  if (trimmedQuery.endsWith(";")) {
    if (trimmedQuery.indexOf(";") !== trimmedQuery.length - 1) {
      return false; // There is more than one semicolon or it's not at the end
    }
  } else if (trimmedQuery.includes(";")) {
    return false; // Semicolon is not allowed anywhere else
  }

  // Enhanced check for comments
  if (/\/\*.*\*\//.test(trimmedQuery) || /--.*/.test(trimmedQuery)) {
    return false;
  }

  // Check for INTO keyword which can be used to write data
  if (trimmedQuery.includes(" INTO ")) {
    return false;
  }

  return true;
}
