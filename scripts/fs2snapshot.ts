import { promises as fs } from "node:fs";
import * as path from "node:path";
import ignore, { Ignore } from "ignore";

interface File {
  contents: string;
}

interface Directory {
  [fileName: string]: File | Directory;
}

const USE_GITIGNORE = true;
// const USE_GITIGNORE = false;

async function dirToFileSystemTree(basePath: string): Promise<Directory> {
  const fileSystemTree: Directory = {};
  const root = path.normalize(basePath);
  const stack: { dir: string; parent: Directory }[] = [
    { dir: root, parent: fileSystemTree },
  ];
  const gitIgnoreFile = ".gitignore";
  const ignoreList = await getIgnoreList(root, gitIgnoreFile);

  while (stack.length > 0) {
    const { dir, parent } = stack.pop()!;
    const entries = await readDir(dir);

    for (const entry of entries) {
      const filePath = path.join(dir, entry);
      if (USE_GITIGNORE && ignoreList.ignores(filePath)) {
        continue;
      }
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        const newDir: Directory = {};
        parent[entry] = { directory: newDir };
        stack.push({ dir: filePath, parent: newDir });
      } else if (stat.isFile()) {
        const contents = await fs.readFile(filePath, "utf8");
        parent[entry] = { file: { contents } };
      }
    }
  }

  return fileSystemTree;
}

async function getIgnoreList(
  basePath: string,
  ignoreFile: string
): Promise<Ignore> {
  const filePath = path.join(basePath, ignoreFile);
  try {
    const contents = await fs.readFile(filePath, "utf8");
    return ignore().add(contents);
  } catch {
    return ignore();
  }
}

async function readDir(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir);
  return entries.filter((entry) => entry !== "." && entry !== "..");
}

async function main(inputPath: string) {
  const out = await dirToFileSystemTree(inputPath);
  await fs.writeFile(
    `${inputPath.replace("templates/", "public/templates/")}.json`,
    JSON.stringify(out)
    // JSON.stringify(out, null, 2),
  );
}

main("./templates/vite-react-tw-query-mui");
console.log("fs2snapshot done!");
