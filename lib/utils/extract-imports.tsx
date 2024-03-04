// @ts-nocheck wip
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import {
  ImportDeclaration,
  JSXOpeningElement,
  Identifier,
  VariableDeclarator,
  FunctionDeclaration,
  ClassDeclaration,
} from "@babel/types";

const extractImports = (program: string): string[] => {
  const imports: Set<string> = new Set();
  const definedVariables: Set<string> = new Set();

  const ast = parser.parse(program, {
    sourceType: "module",
    plugins: [
      "jsx", // Enable JSX parsing
      "typescript", // Enable TypeScript parsing
    ],
  });

  traverse(ast, {
    ImportDeclaration({ node }: { node: ImportDeclaration }) {
      node.specifiers.forEach((specifier) => {
        imports.add(specifier.local.name);
      });
    },
    // JSXOpeningElement({ node }: { node: JSXOpeningElement }) {
    //   if (node.name.type === "JSXIdentifier") {
    //     const name = node.name.name;
    //     if (definedVariables.has(name) || imports.has(name)) {
    //       // If the variable is defined in the file or imported, add it to the imports set
    //       imports.add(name);
    //     }
    //   }
    // },
    VariableDeclarator({ node }: { node: VariableDeclarator }) {
      if (node.id.type === "Identifier") {
        definedVariables.add(node.id.name);
      }
    },
    FunctionDeclaration({ node }: { node: FunctionDeclaration }) {
      if (node.id && node.id.type === "Identifier") {
        definedVariables.add(node.id.name);
      }
    },
    ClassDeclaration({ node }: { node: ClassDeclaration }) {
      if (node.id && node.id.type === "Identifier") {
        definedVariables.add(node.id.name);
      }
    },
    Identifier({ node }: { node: Identifier }) {
      // This was collecting all identifiers indiscriminately.
      // We now handle identifiers more selectively above.
    },
  });

  console.log(definedVariables, imports);

  // Filter out the imports to include only those that are not defined within the file
  const finalImports = Array.from(imports).filter(
    (importName) => !definedVariables.has(importName)
  );

  return finalImports;
};

export { extractImports };
