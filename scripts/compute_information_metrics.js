/*
  Compute Information Metrics (Fan-in, Fan-out, I) for functions across the codebase.
  - Scans .ts and .tsx files using the TypeScript compiler API (no extra deps).
  - Builds a simple call graph using the TypeChecker to resolve called symbols.
  - Outputs results to scripts/information_metrics.{json,csv} and prints top entries.
*/

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Configuration
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_JSON = path.resolve(__dirname, 'information_metrics.json');
const OUTPUT_CSV = path.resolve(__dirname, 'information_metrics.csv');

// Directories to include (relative to project root)
const INCLUDE_DIRS = [
  'app',
  'components',
  'hooks',
  'lib',
];

// File extensions to include
const EXTENSIONS = new Set(['.ts', '.tsx']);

function walkFiles(dir, results) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, results);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
}

function gatherSourceFiles() {
  const files = [];
  for (const rel of INCLUDE_DIRS) {
    const dir = path.join(PROJECT_ROOT, rel);
    if (fs.existsSync(dir)) {
      walkFiles(dir, files);
    }
  }
  return files;
}

function getTsConfig() {
  const tsconfigPath = path.join(PROJECT_ROOT, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) return undefined;
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) return undefined;
  const parseResult = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    PROJECT_ROOT,
  );
  return parseResult;
}

// Create TypeScript program
function createProgram() {
  const fileNames = gatherSourceFiles();
  const parsed = getTsConfig();
  const compilerOptions = parsed ? parsed.options : {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    allowJs: false,
    skipLibCheck: true,
  };
  return ts.createProgram({ rootNames: fileNames, options: compilerOptions });
}

// Utilities to create stable identifiers for functions
function getSourceFileId(sf) {
  return path.relative(PROJECT_ROOT, sf.fileName);
}

function posKey(node) {
  const sf = node.getSourceFile();
  return `${getSourceFileId(sf)}:${node.pos}-${node.end}`;
}

function functionId(node) {
  const sfid = getSourceFileId(node.getSourceFile());
  const name = getFunctionName(node);
  return `${sfid}#${name}:${node.pos}-${node.end}`;
}

function getFunctionName(node) {
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.getText();
  if (ts.isMethodDeclaration(node) && node.name) return node.name.getText();
  if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
    // Attempt to get variable name if assigned
    if (
      node.parent &&
      ts.isVariableDeclaration(node.parent) &&
      node.parent.name &&
      ts.isIdentifier(node.parent.name)
    ) {
      return node.parent.name.text;
    }
    // Attempt to get property assignment name
    if (node.parent && ts.isPropertyAssignment(node.parent)) {
      return node.parent.name.getText();
    }
    // Fallback anonymous
    return 'anonymous';
  }
  if (ts.isClassDeclaration(node) && node.name) return `class ${node.name.text}`;
  return 'unknown';
}

function isFunctionLike(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node)
  );
}

function findEnclosingFunction(node) {
  let current = node;
  while (current) {
    if (isFunctionLike(current)) return current;
    current = current.parent;
  }
  return undefined; // top-level
}

function collectFunctionsAndCalls(program) {
  const checker = program.getTypeChecker();

  /** @type {Map<string, { id: string, file: string, name: string, node: ts.Node }>} */
  const functions = new Map();
  /** @type {Map<string, Set<string>>} */
  const edges = new Map(); // caller -> Set<callee>

  function ensureFunctionEntry(fnNode) {
    const id = functionId(fnNode);
    if (!functions.has(id)) {
      functions.set(id, {
        id,
        file: getSourceFileId(fnNode.getSourceFile()),
        name: getFunctionName(fnNode),
        node: fnNode,
      });
    }
    return id;
  }

  function addEdge(callerId, calleeId) {
    if (!edges.has(callerId)) edges.set(callerId, new Set());
    edges.get(callerId).add(calleeId);
  }

  for (const sf of program.getSourceFiles()) {
    const rel = getSourceFileId(sf);
    // Only analyze project files in our include list
    if (
      !INCLUDE_DIRS.some((d) => rel === d || rel.startsWith(d + path.sep)) ||
      sf.isDeclarationFile
    ) {
      continue;
    }

    function visit(node) {
      // Track function-like nodes
      if (isFunctionLike(node)) {
        ensureFunctionEntry(node);
      }

      // Track calls
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const enclosing = findEnclosingFunction(node);
        if (!enclosing) {
          // Skip top-level calls for now (could be attributed to module-level)
        } else {
          const callerId = ensureFunctionEntry(enclosing);
          try {
            const symbol = checker.getSymbolAtLocation(node.expression);
            if (symbol) {
              // If it's an alias, get the aliased symbol
              const aliased = ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
              const decls = aliased.getDeclarations() || [];
              for (const decl of decls) {
                // Only consider function-like declarations in our project
                if (decl && decl.getSourceFile && !decl.getSourceFile().isDeclarationFile) {
                  if (isFunctionLike(decl) || ts.isFunctionDeclaration(decl) || ts.isMethodDeclaration(decl)) {
                    const calleeId = functionId(decl);
                    // Ensure callee is recorded
                    ensureFunctionEntry(decl);
                    addEdge(callerId, calleeId);
                  }
                }
              }
            }
          } catch (_) {
            // best-effort; ignore resolution failures
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sf);
  }

  return { functions, edges };
}

function computeMetrics(functions, edges) {
  /** @type {Map<string, Set<string>>} */
  const incoming = new Map(); // callee -> Set<caller>
  /** @type {Map<string, Set<string>>} */
  const outgoing = new Map(); // caller -> Set<callee>

  for (const [caller, callees] of edges.entries()) {
    if (!outgoing.has(caller)) outgoing.set(caller, new Set());
    for (const callee of callees) {
      outgoing.get(caller).add(callee);
      if (!incoming.has(callee)) incoming.set(callee, new Set());
      incoming.get(callee).add(caller);
    }
  }

  const rows = [];
  for (const [id, info] of functions.entries()) {
    const fanOut = outgoing.get(id)?.size || 0;
    const fanIn = incoming.get(id)?.size || 0;
    const I = Math.pow(fanIn * fanOut, 2); // (Fan-in × Fan-out)^2
    rows.push({
      id,
      file: info.file,
      name: info.name,
      fanIn,
      fanOut,
      informationMetric: I,
    });
  }
  return rows;
}

function toCsv(rows) {
  const header = ['file', 'name', 'fanIn', 'fanOut', 'informationMetric', 'id'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const vals = header.map((k) => {
      const v = r[k];
      if (typeof v === 'string') {
        const escaped = v.replace(/"/g, '""');
        return `"${escaped}"`;
      }
      return String(v);
    });
    lines.push(vals.join(','));
  }
  return lines.join('\n');
}

function main() {
  console.log('Building program...');
  const program = createProgram();
  console.log('Analyzing functions and calls...');
  const { functions, edges } = collectFunctionsAndCalls(program);
  console.log(`Functions detected: ${functions.size}`);
  console.log(`Call edges detected: ${[...edges.values()].reduce((a, s) => a + s.size, 0)}`);

  const rows = computeMetrics(functions, edges);
  // Sort by information metric desc
  rows.sort((a, b) => b.informationMetric - a.informationMetric);

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(rows, null, 2));
  fs.writeFileSync(OUTPUT_CSV, toCsv(rows));

  console.log(`\nTop 20 by information metric:`);
  for (const r of rows.slice(0, 20)) {
    console.log(`${r.informationMetric.toString().padStart(6)}  ${r.fanIn} in  ${r.fanOut} out  ${r.file} :: ${r.name}`);
  }
  console.log(`\nWrote ${rows.length} rows to:`);
  console.log(`- ${OUTPUT_JSON}`);
  console.log(`- ${OUTPUT_CSV}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}


