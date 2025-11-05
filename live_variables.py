#!/usr/bin/env python3
import argparse
import ast
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple


# A scope represents a region in the source code where variables can be defined and are visible.
# We derive scope boundaries from AST nodes that introduce new scopes: Module, FunctionDef, AsyncFunctionDef, ClassDef.


@dataclass
class Definition:
    name: str
    line: int
    deleted_from: Optional[int] = None  # first line where name is deleted (no longer available)


@dataclass
class Scope:
    kind: str  # 'module' | 'function' | 'class'
    name: str
    start_line: int
    end_line: int
    parent: Optional["Scope"] = None
    children: List["Scope"] = field(default_factory=list)
    # map name -> list of definitions (to handle re-definitions over time)
    definitions: Dict[str, List[Definition]] = field(default_factory=dict)

    def add_definition(self, name: str, line: int) -> None:
        self.definitions.setdefault(name, []).append(Definition(name=name, line=line))

    def add_deletion(self, name: str, line: int) -> None:
        defs = self.definitions.get(name)
        if not defs:
            return
        # mark the latest definition as deleted from this line
        defs[-1].deleted_from = line

    def available_names_at(self, line: int) -> Set[str]:
        names: Set[str] = set()
        for name, defs in self.definitions.items():
            # find the newest definition not after 'line'
            latest: Optional[Definition] = None
            for d in defs:
                if d.line <= line and (latest is None or d.line > latest.line):
                    latest = d
            if latest is None:
                continue
            if latest.deleted_from is not None and latest.deleted_from <= line:
                continue
            names.add(name)
        return names


def get_end_lineno(node: ast.AST) -> int:
    # Python 3.8+ generally provides end_lineno, but fall back to lineno if missing
    return getattr(node, "end_lineno", getattr(node, "lineno", 0)) or 0


def build_scope_tree(tree: ast.AST) -> Scope:
    module_scope = Scope(
        kind="module",
        name="<module>",
        start_line=1,
        end_line=get_end_lineno(tree) or 10 ** 9,
        parent=None,
    )

    # Helper to enter scopes and record definitions
    def visit(node: ast.AST, current: Scope) -> None:
        # Handle new scopes
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            func_scope = Scope(
                kind="function",
                name=node.name,
                start_line=node.lineno,
                end_line=get_end_lineno(node),
                parent=current,
            )
            current.children.append(func_scope)
            # Function name is defined in the parent scope at def line
            current.add_definition(node.name, node.lineno)
            # Parameters are defined in the function scope at the function header line
            for arg in list(node.args.posonlyargs) + list(node.args.args):
                func_scope.add_definition(arg.arg, node.lineno)
            if node.args.vararg is not None:
                func_scope.add_definition(node.args.vararg.arg, node.lineno)
            for arg in node.args.kwonlyargs:
                func_scope.add_definition(arg.arg, node.lineno)
            if node.args.kwarg is not None:
                func_scope.add_definition(node.args.kwarg.arg, node.lineno)
            # defaults annotated/values don't introduce local names (other than via assignment expressions), skip
            # Visit body inside the function scope
            for child in ast.iter_child_nodes(node):
                # avoid re-visiting decorator list etc. but harmless
                visit(child, func_scope)
            return
        if isinstance(node, ast.ClassDef):
            class_scope = Scope(
                kind="class",
                name=node.name,
                start_line=node.lineno,
                end_line=get_end_lineno(node),
                parent=current,
            )
            current.children.append(class_scope)
            # Class name is defined in the parent scope
            current.add_definition(node.name, node.lineno)
            for child in ast.iter_child_nodes(node):
                visit(child, class_scope)
            return

        # Record definitions and deletions within current scope
        if isinstance(node, ast.Assign):
            for target in node.targets:
                for name, line in iter_assigned_names(target):
                    current.add_definition(name, line)
        elif isinstance(node, ast.AnnAssign):
            if node.target is not None:
                for name, line in iter_assigned_names(node.target):
                    current.add_definition(name, line)
        elif isinstance(node, ast.AugAssign):
            for name, line in iter_assigned_names(node.target):
                current.add_definition(name, line)
        elif isinstance(node, ast.NamedExpr):  # walrus operator inside expressions
            for name, line in iter_assigned_names(node.target):
                current.add_definition(name, line)
        elif isinstance(node, ast.For):
            for name, line in iter_assigned_names(node.target):
                current.add_definition(name, line)
        elif isinstance(node, ast.AsyncFor):
            for name, line in iter_assigned_names(node.target):
                current.add_definition(name, line)
        elif isinstance(node, ast.With):
            for item in node.items:
                if item.optional_vars is not None:
                    for name, line in iter_assigned_names(item.optional_vars):
                        current.add_definition(name, line)
        elif isinstance(node, ast.AsyncWith):
            for item in node.items:
                if item.optional_vars is not None:
                    for name, line in iter_assigned_names(item.optional_vars):
                        current.add_definition(name, line)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            for alias in node.names:
                # import x as y -> defines y else x
                defined = alias.asname or alias.name.split(".")[0]
                current.add_definition(defined, node.lineno)
        elif isinstance(node, ast.ExceptHandler):
            if node.name:
                current.add_definition(node.name, node.lineno)
        elif isinstance(node, ast.comprehension):
            for name, line in iter_assigned_names(node.target):
                current.add_definition(name, line)
        elif isinstance(node, ast.Delete):
            for target in node.targets:
                for name, line in iter_assigned_names(target):
                    current.add_deletion(name, node.lineno)

        # Recurse
        for child in ast.iter_child_nodes(node):
            visit(child, current)

    visit(tree, module_scope)
    return module_scope


def iter_assigned_names(target: ast.AST) -> List[Tuple[str, int]]:
    names: List[Tuple[str, int]] = []
    def _visit(t: ast.AST):
        if isinstance(t, ast.Name) and isinstance(t.ctx, (ast.Store, ast.Param)):
            names.append((t.id, t.lineno))
        elif isinstance(t, (ast.Tuple, ast.List)):
            for elt in t.elts:
                _visit(elt)
        elif isinstance(t, ast.Attribute):
            # attribute assignments do not create names in scope
            return
        elif isinstance(t, ast.Subscript):
            return
        elif isinstance(t, ast.Starred):
            _visit(t.value)
        # Ignore others
    _visit(target)
    return names


def scope_stack_at(scope: Scope, line: int) -> List[Scope]:
    stack: List[Scope] = []

    def dfs(s: Scope):
        if not (s.start_line <= line <= s.end_line):
            return False
        stack.append(s)
        for child in s.children:
            if dfs(child):
                break
        return True

    dfs(scope)
    return stack


def compute_available_variables_per_line(source: str) -> Dict[int, Set[str]]:
    tree = ast.parse(source)
    root_scope = build_scope_tree(tree)
    lines = source.splitlines()
    result: Dict[int, Set[str]] = {}
    for i in range(1, len(lines) + 1):
        stack = scope_stack_at(root_scope, i)
        names: Set[str] = set()
        for s in stack:
            names |= s.available_names_at(i)
        result[i] = names
    return result


def print_table(available: Dict[int, Set[str]], fmt: str, path: str, total_lines: int) -> None:
    if fmt == "csv":
        print("line,variables")
        for i in range(1, total_lines + 1):
            vars_str = ";".join(sorted(available.get(i, set())))
            print(f"{i},\"{vars_str}\"")
        return
    if fmt == "json":
        import json
        obj = {str(i): sorted(list(available.get(i, set()))) for i in range(1, total_lines + 1)}
        print(json.dumps({"file": path, "lines": obj}, indent=2))
        return
    # pretty table
    width = len(str(total_lines))
    header_line = f"{'line'.rjust(width)} | variables"
    sep = f"{'-' * width}-+{"-" * 1}----------------------------"
    print(header_line)
    print("-" * len(header_line))
    for i in range(1, total_lines + 1):
        vars_str = ", ".join(sorted(available.get(i, set())))
        print(f"{str(i).rjust(width)} | {vars_str}")


def main() -> None:
    parser = argparse.ArgumentParser(description="List available variables per line for a Python source file.")
    parser.add_argument("path", help="Path to a Python source file")
    parser.add_argument("--format", "-f", choices=["table", "csv", "json"], default="table", help="Output format")
    args = parser.parse_args()

    try:
        with open(args.path, "r", encoding="utf-8") as f:
            source = f.read()
    except OSError as e:
        print(f"error: could not read file '{args.path}': {e}", file=sys.stderr)
        sys.exit(1)

    available = compute_available_variables_per_line(source)
    total_lines = len(source.splitlines())
    print_table(available, args.format, args.path, total_lines)


if __name__ == "__main__":
    main()


