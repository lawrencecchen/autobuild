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

const getMissingImports = (program: string): string[] => {
  const definedVariables: Set<string> = new Set();
  const allIdentifiers: Set<string> = new Set();
  const scopeStack: Set<string>[] = [definedVariables]; // Stack to manage scopes

  const ast = parser.parse(program, {
    sourceType: "module",
    plugins: [
      "jsx", // Enable JSX parsing
      "typescript", // Enable TypeScript parsing
    ],
  });

  const pushScope = () => {
    const newScope = new Set<string>();
    scopeStack.push(newScope);
    return newScope;
  };

  const popScope = () => {
    scopeStack.pop();
  };

  const addDefinedVariable = (name: string) => {
    if (scopeStack.length > 0) {
      scopeStack[scopeStack.length - 1].add(name);
    }
  };

  traverse(ast, {
    ImportDeclaration({ node }: { node: ImportDeclaration }) {
      node.specifiers.forEach((specifier) => {
        addDefinedVariable(specifier.local.name);
      });
    },
    VariableDeclarator({ node }: { node: VariableDeclarator }) {
      if (node.id.type === "Identifier") {
        addDefinedVariable(node.id.name);
      } else if (node.id.type === "ObjectPattern") {
        node.id.properties.forEach((property) => {
          if (
            property.type === "ObjectProperty" &&
            property.key.type === "Identifier"
          ) {
            addDefinedVariable(property.key.name);
          } else if (
            property.type === "RestElement" &&
            property.argument.type === "Identifier"
          ) {
            addDefinedVariable(property.argument.name);
          }
        });
      }
    },
    FunctionDeclaration({ node }: { node: FunctionDeclaration }) {
      if (node.id && node.id.type === "Identifier") {
        addDefinedVariable(node.id.name);
      }
    },
    ClassDeclaration({ node }: { node: ClassDeclaration }) {
      if (node.id && node.id.type === "Identifier") {
        addDefinedVariable(node.id.name);
      }
    },
    ArrowFunctionExpression({ node }: { node: any }) {
      const newScope = pushScope();
      if (node.params) {
        node.params.forEach((param: any) => {
          if (param.type === "Identifier") {
            newScope.add(param.name);
          }
        });
      }
    },
    FunctionExpression({ node }: { node: any }) {
      const newScope = pushScope();
      if (node.params) {
        node.params.forEach((param: any) => {
          if (param.type === "Identifier") {
            newScope.add(param.name);
          }
        });
      }
    },
    Identifier({ node }: { node: Identifier }) {
      allIdentifiers.add(node.name);
    },
    exit({ node }: { node: any }) {
      if (
        node.type === "ArrowFunctionExpression" ||
        node.type === "FunctionExpression"
      ) {
        popScope();
      }
    },
  });

  const missingImports = Array.from(allIdentifiers).filter(
    (identifier) => !scopeStack.some((scope) => scope.has(identifier))
  );

  return missingImports;
};
export { getMissingImports as extractImports };

describe("extractImports", () => {
  it("should extract imports from an example program", () => {
    const program = `\
const CustomersTable = () => {
  const { data, isLoading, error } = useQuery({
    queryFn: ['fetchAllCustomers', []]
  });

  if (isLoading) return <CircularProgress />;
  if (error) return <Typography color="error">Error: {error.message}</Typography>;

  return (
    <TableContainer component={Paper}>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow>h
            <TableCell>Id</TableCell>
            <TableCell>Company Name</TableCell>
            <TableCell>Contact Name</TableCell>
            <TableCell>Contact Title</TableCell>
            <TableCell>Address</TableCell>
            <TableCell>City</TableCell>
            <TableCell>Region</TableCell>
            <TableCell>Postal Code</TableCell>
            <TableCell>Country</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Fax</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.Id}>
              <TableCell>{row.Id}</TableCell>
              <TableCell>{row.CompanyName}</TableCell>
              <TableCell>{row.ContactName}</TableCell>
              <TableCell>{row.ContactTitle}</TableCell>
              <TableCell>{row.Address}</TableCell>
              <TableCell>{row.City}</TableCell>
              <TableCell>{row.Region}</TableCell>
              <TableCell>{row.PostalCode}</TableCell>
              <TableCell>{row.Country}</TableCell>
              <TableCell>{row.Phone}</TableCell>
              <TableCell>{row.Fax}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CustomersTable;`;
    const missingImports = getMissingImports(program);
    console.log(missingImports);
    expect(missingImports).toEqual(
      new Set([
        "useQuery",
        "CircularProgress",
        "Typography",
        "TableContainer",
        "Paper",
        "Table",
        "TableHead",
        "TableRow",
        "TableCell",
        "TableBody",
      ])
    );
  });
});
