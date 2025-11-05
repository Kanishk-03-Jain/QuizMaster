#!/usr/bin/env node
/*
  Live variables per line for a TypeScript project using the TypeScript compiler API.
  - Scans all .ts/.tsx files (excluding node_modules)
  - Builds scope tree (file, function-like, class, block, loop)
  - Collects value-space bindings: variables, params, catch clause (excludes function/class/enum names and imports)
  - Prints a table per file: line -> variables available (union of enclosing scopes)
*/

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function walkDir(root, dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full);
    if (rel.includes(`node_modules${path.sep}`)) continue;
    if (entry.isDirectory()) {
      walkDir(root, full, files);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
}

function lineOf(sourceFile, pos) {
  return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
}

function Scope(kind, name, start, end, parent) {
  this.kind = kind;
  this.name = name;
  this.startLine = start;
  this.endLine = end;
  this.parent = parent || null;
  this.children = [];
  this.definitions = new Map(); // name -> first defined line
}

Scope.prototype.addDefinition = function (name, line) {
  if (!this.definitions.has(name)) {
    this.definitions.set(name, line);
  }
};

Scope.prototype.availableAt = function (line) {
  const out = new Set();
  for (const [name, defLine] of this.definitions) {
    if (defLine <= line) out.add(name);
  }
  return out;
};

function isFunctionLike(node) {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node);
}

function isBlockScope(node) {
  // Blocks introduce scope for let/const; also CaseBlock, ModuleBlock, For/ForIn/ForOf, CatchClause
  return ts.isBlock(node) || ts.isCaseBlock(node) || ts.isModuleBlock(node) || ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node) || ts.isCatchClause(node);
}

function addParamBindings(scope, node, sourceFile) {
  if (!node.parameters) return;
  for (const p of node.parameters) {
    collectBindingNames(p.name, (n) => scope.addDefinition(n, lineOf(sourceFile, p.getStart(sourceFile))));
  }
}

function collectBindingNames(nameNode, cb) {
  if (ts.isIdentifier(nameNode)) {
    cb(nameNode.text);
    return;
  }
  if (ts.isObjectBindingPattern(nameNode) || ts.isArrayBindingPattern(nameNode)) {
    for (const e of nameNode.elements) {
      if (ts.isBindingElement(e)) {
        if (e.name) collectBindingNames(e.name, cb);
      }
    }
  }
}

function addVarDeclBindings(scope, decl, sourceFile) {
  collectBindingNames(decl.name, (n) => scope.addDefinition(n, lineOf(sourceFile, decl.getStart(sourceFile))));
}

function buildScopeTree(sourceFile) {
  const fileScope = new Scope('file', sourceFile.fileName, 1, sourceFile.getLineAndCharacterOfPosition(sourceFile.end).line + 1, null);

  function enterChild(kind, name, node, parent) {
    const s = new Scope(kind, name, lineOf(sourceFile, node.getStart(sourceFile)), lineOf(sourceFile, node.end), parent);
    parent.children.push(s);
    return s;
  }

  function visit(node, current) {
    // Intentionally exclude function/class/enum names from variables
    if (ts.isVariableStatement(node)) {
      const isVar = node.declarationList.flags & ts.NodeFlags.Var;
      const targetScope = isVar ? nearestFunctionScope(current) : current; // var hoists to function scope
      for (const decl of node.declarationList.declarations) {
        addVarDeclBindings(targetScope, decl, sourceFile);
      }
    }
    // Intentionally ignore imports; we only care about parameters and variables
    if (ts.isCatchClause(node) && node.variableDeclaration && node.variableDeclaration.name) {
      collectBindingNames(node.variableDeclaration.name, (n) => current.addDefinition(n, lineOf(sourceFile, node.getStart(sourceFile))));
    }

    // New scopes
    if (ts.isClassDeclaration(node) && node.name) {
      const s = enterChild('class', node.name.text, node, current);
      node.members.forEach((m) => visit(m, s));
      return;
    }
    if (isFunctionLike(node)) {
      const name = node.name && ts.isIdentifier(node.name) ? node.name.text : '<function>';
      const s = enterChild('function', name, node, current);
      addParamBindings(s, node, sourceFile);
      ts.forEachChild(node, (child) => visit(child, s));
      return;
    }
    if (isBlockScope(node)) {
      const s = enterChild('block', '<block>', node, current);
      ts.forEachChild(node, (child) => visit(child, s));
      return;
    }

    ts.forEachChild(node, (child) => visit(child, current));
  }

  visit(sourceFile, fileScope);
  return fileScope;
}

function nearestFunctionScope(scope) {
  let s = scope;
  while (s && s.kind !== 'function' && s.kind !== 'file') s = s.parent;
  return s || scope;
}

function scopeStackAt(scope, line) {
  const stack = [];
  (function dfs(s) {
    if (!(s.startLine <= line && line <= s.endLine)) return false;
    stack.push(s);
    for (const c of s.children) {
      if (dfs(c)) return true;
    }
    return true;
  })(scope);
  return stack;
}

function computeAvailablePerLine(sourceFile, rootScope) {
  const total = sourceFile.getLineAndCharacterOfPosition(sourceFile.end).line + 1;
  const map = new Map();
  for (let i = 1; i <= total; i++) {
    const stack = scopeStackAt(rootScope, i);
    const names = new Set();
    for (const s of stack) {
      for (const n of s.availableAt(i)) names.add(n);
    }
    map.set(i, [...names].sort());
  }
  return { total, map };
}

function printTable(filePath, total, map) {
  const width = String(total).length;
  console.log(`\nFile: ${filePath}`);
  const header = `${String('line').padStart(width)} | variables | total`;
  console.log(header);
  console.log('-'.repeat(header.length));
  for (let i = 1; i <= total; i++) {
    const list = map.get(i) || [];
    const vars = list.join(', ');
    console.log(`${String(i).padStart(width)} | ${vars} | ${list.length}`);
  }
}

function main() {
  const projectRoot = process.cwd();
  const args = process.argv.slice(2);
  let targetDir = projectRoot;
  let format = 'table';
  let outputFile = null;
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '-d' || args[i] === '--dir') && args[i + 1]) {
      targetDir = path.resolve(args[++i]);
    } else if ((args[i] === '-f' || args[i] === '--format') && args[i + 1]) {
      format = args[++i];
    } else if ((args[i] === '-o' || args[i] === '--output') && args[i + 1]) {
      outputFile = path.resolve(args[++i]);
    }
  }

  const files = [];
  walkDir(targetDir, targetDir, files);
  if (files.length === 0) {
    console.error('No .ts or .tsx files found.');
    process.exit(1);
  }

  const compilerOptions = { allowJs: false, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext };
  const host = ts.createCompilerHost(compilerOptions, true);
  const program = ts.createProgram(files, compilerOptions, host);

  const outputLines = [];
  let csvHeaderPrinted = false;

  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile) continue;
    if (!sf.fileName.startsWith(targetDir)) continue;
    const rootScope = buildScopeTree(sf);
    const { total, map } = computeAvailablePerLine(sf, rootScope);
    if (format === 'json') {
      const obj = {};
      for (let i = 1; i <= total; i++) {
        const list = map.get(i) || [];
        obj[String(i)] = { variables: list, total: list.length };
      }
      outputLines.push(JSON.stringify({ file: sf.fileName, lines: obj }, null, 2));
    } else if (format === 'csv') {
      if (!csvHeaderPrinted) {
        outputLines.push(`file,line,variables,total`);
        csvHeaderPrinted = true;
      }
      for (let i = 1; i <= total; i++) {
        const list = (map.get(i) || []);
        const vars = list.join(';');
        outputLines.push(`${JSON.stringify(sf.fileName)},${i},${JSON.stringify(vars)},${list.length}`);
      }
    } else {
      // For table format, output directly if no file specified
      if (outputFile) {
        outputLines.push(`\nFile: ${sf.fileName}`);
        const width = String(total).length;
        const header = `${String('line').padStart(width)} | variables | total`;
        outputLines.push(header);
        outputLines.push('-'.repeat(header.length));
        for (let i = 1; i <= total; i++) {
          const list = map.get(i) || [];
          const vars = list.join(', ');
          outputLines.push(`${String(i).padStart(width)} | ${vars} | ${list.length}`);
        }
      } else {
        printTable(sf.fileName, total, map);
      }
    }
  }

  // Write to file or console
  const output = outputLines.join('\n');
  if (outputFile) {
    fs.writeFileSync(outputFile, output, 'utf-8');
    console.log(`Output saved to: ${outputFile}`);
  } else if (outputLines.length > 0) {
    console.log(output);
  }
}

if (require.main === module) {
  main();
}


