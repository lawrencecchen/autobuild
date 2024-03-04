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

const getMissingImports = (program: string): Set<string> => {
  const definedVariables: Set<string> = new Set();
  const allIdentifiers: Set<string> = new Set();

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
        definedVariables.add(specifier.local.name);
      });
    },
    VariableDeclarator({ node }: { node: VariableDeclarator }) {
      if (node.id.type === "Identifier") {
        definedVariables.add(node.id.name);
      } else if (node.id.type === "ObjectPattern") {
        node.id.properties.forEach((property) => {
          if (
            property.type === "ObjectProperty" &&
            property.key.type === "Identifier"
          ) {
            definedVariables.add(property.key.name);
          } else if (
            property.type === "RestElement" &&
            property.argument.type === "Identifier"
          ) {
            definedVariables.add(property.argument.name);
          }
        });
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
      allIdentifiers.add(node.name);
    },
  });

  console.log(definedVariables, allIdentifiers);

  const missingImports = new Set<string>();
  allIdentifiers.forEach((identifier) => {
    if (!definedVariables.has(identifier)) {
      missingImports.add(identifier);
    }
  });

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
