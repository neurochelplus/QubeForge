/**
 * Unit tests for AST utility functions
 * 
 * Feature: code-audit-system
 * These tests verify the core AST manipulation functions work correctly
 * with various TypeScript code structures.
 * 
 * @vitest-environment node
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { parseFile, traverseAST, getNodeLocation, isFunction, isClass } from './ast-utils';

// Temporary test files directory
const TEST_DIR = path.join(__dirname, '__test_files__');

describe('AST Utils - Unit Tests', () => {
  beforeAll(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('parseFile', () => {
    test('should parse a valid TypeScript file', () => {
      // Create a valid test file
      const testFile = path.join(TEST_DIR, 'valid.ts');
      const testContent = `
        function hello(name: string): string {
          return \`Hello, \${name}!\`;
        }
        
        class TestClass {
          private value: number = 42;
          
          getValue(): number {
            return this.value;
          }
        }
      `;
      fs.writeFileSync(testFile, testContent, 'utf-8');

      // Parse the file
      const ast = parseFile(testFile);

      // Verify the result
      expect(ast).toBeDefined();
      expect(ts.isSourceFile(ast)).toBe(true);
      // Normalize path separators for cross-platform compatibility
      expect(ast.fileName.replace(/\\/g, '/')).toBe(testFile.replace(/\\/g, '/'));
      expect(ast.text).toBe(testContent);
    });

    test('should parse a file with syntax errors (TypeScript is permissive)', () => {
      // Create a file with syntax errors
      const testFile = path.join(TEST_DIR, 'syntax-error.ts');
      const testContent = `
        function broken( {
          return "missing closing brace"
        }
      `;
      fs.writeFileSync(testFile, testContent, 'utf-8');

      // Parse the file - TypeScript parser is permissive and will still create an AST
      const ast = parseFile(testFile);

      // Verify the result - AST is created even with errors
      expect(ast).toBeDefined();
      expect(ts.isSourceFile(ast)).toBe(true);
      // The AST will have error nodes, but parsing doesn't throw
    });

    test('should throw error if file does not exist', () => {
      const nonExistentFile = path.join(TEST_DIR, 'does-not-exist.ts');

      expect(() => parseFile(nonExistentFile)).toThrow();
    });
  });

  describe('traverseAST', () => {
    test('should visit all nodes in the AST', () => {
      // Create a test file
      const testFile = path.join(TEST_DIR, 'traverse.ts');
      const testContent = `
        const x = 1;
        function foo() {
          return x + 1;
        }
      `;
      fs.writeFileSync(testFile, testContent, 'utf-8');

      const ast = parseFile(testFile);
      const visitedNodes: ts.SyntaxKind[] = [];

      // Traverse and collect node kinds
      traverseAST(ast, (node) => {
        visitedNodes.push(node.kind);
      });

      // Verify we visited multiple nodes
      expect(visitedNodes.length).toBeGreaterThan(0);
      
      // Verify we visited the source file itself
      expect(visitedNodes[0]).toBe(ts.SyntaxKind.SourceFile);
      
      // Verify we visited some expected node types
      expect(visitedNodes).toContain(ts.SyntaxKind.VariableStatement);
      expect(visitedNodes).toContain(ts.SyntaxKind.FunctionDeclaration);
    });

    test('should call visitor function for each node exactly once', () => {
      const testFile = path.join(TEST_DIR, 'visitor-count.ts');
      const testContent = `const a = 1;`;
      fs.writeFileSync(testFile, testContent, 'utf-8');

      const ast = parseFile(testFile);
      const visitCounts = new Map<ts.Node, number>();

      traverseAST(ast, (node) => {
        visitCounts.set(node, (visitCounts.get(node) || 0) + 1);
      });

      // Each node should be visited exactly once
      for (const count of visitCounts.values()) {
        expect(count).toBe(1);
      }
    });
  });

  describe('getNodeLocation', () => {
    test('should return correct line and column for a node', () => {
      const testFile = path.join(TEST_DIR, 'location.ts');
      const testContent = `const x = 1;\nfunction foo() {\n  return 42;\n}`;
      fs.writeFileSync(testFile, testContent, 'utf-8');

      const ast = parseFile(testFile);
      let functionNode: ts.Node | undefined;

      // Find the function declaration
      traverseAST(ast, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          functionNode = node;
        }
      });

      expect(functionNode).toBeDefined();
      
      const location = getNodeLocation(functionNode!);
      
      // Function is on line 2 (1-indexed)
      expect(location.line).toBe(2);
      expect(location.column).toBeGreaterThan(0);
    });

    test('should return 1-indexed line and column numbers', () => {
      const testFile = path.join(TEST_DIR, 'first-line.ts');
      const testContent = `const x = 1;`;
      fs.writeFileSync(testFile, testContent, 'utf-8');

      const ast = parseFile(testFile);
      let constNode: ts.Node | undefined;

      // Find the variable statement
      traverseAST(ast, (node) => {
        if (ts.isVariableStatement(node)) {
          constNode = node;
        }
      });

      expect(constNode).toBeDefined();
      
      const location = getNodeLocation(constNode!);
      
      // First line should be 1, not 0
      expect(location.line).toBe(1);
      expect(location.column).toBe(1);
    });
  });

  describe('isFunction', () => {
    test('should identify function declarations', () => {
      const testFile = path.join(TEST_DIR, 'func-decl.ts');
      const testContent = `function myFunc() { return 1; }`;
      fs.writeFileSync(testFile, testContent, 'utf-8');

      const ast = parseFile(testFile);
      let foundFunction = false;

      traverseAST(ast, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          expect(isFunction(node)).toBe(true);
          foundFunction = true;
        }
      });

      expect(foundFunction).toBe(true);
    });

    test('should identify arrow functions', () => {
      const testFile = path.join(TEST_DIR, 'arrow.ts');
      const testContent = `const myFunc = () => 1;`;
      fs.writeFileSync(testFile, testContent, 'utf-8');

      const ast = parseFile(testFile);
      let foundArrowFunction = false;

      traverseAST(ast, (node) => {
        if (ts.isArrowFunction(node)) {
          expect(isFunction(node)).toBe(true);
          foundArrowFunction = true;
        }
      });

      expect(foundArrowFunction).toBe(true);
    });

    test('should identify method declarations', () => {
      const testFile = path.join(TEST_DIR, 'method.ts');
      const testContent = `class MyClass { myMethod() { return 1; } }`;
      fs.writeFileSync(testFile, testContent, 'utf-8');

      const ast = parseFile(testFile);
      let foundMethod = false;

      traverseAST(ast, (node) => {
        if (ts.isMethodDeclaration(node)) {
          expect(isFunction(node)).toBe(true);
          foundMethod = true;
        }
      });

      expect(foundMethod).toBe(true);
    });

    test('should return false for non-function nodes', () => {
      const testFile = path.join(TEST_DIR, 'non-func.ts');
      const testContent = `const x = 1;`;
      fs.writeFileSync(testFile, testContent, 'utf-8');

      const ast = parseFile(testFile);

      traverseAST(ast, (node) => {
        if (ts.isVariableStatement(node)) {
          expect(isFunction(node)).toBe(false);
        }
      });
    });
  });

  describe('isClass', () => {
    test('should identify class declarations', () => {
      const testFile = path.join(TEST_DIR, 'class.ts');
      const testContent = `class MyClass { value = 1; }`;
      fs.writeFileSync(testFile, testContent, 'utf-8');

      const ast = parseFile(testFile);
      let foundClass = false;

      traverseAST(ast, (node) => {
        if (ts.isClassDeclaration(node)) {
          expect(isClass(node)).toBe(true);
          foundClass = true;
        }
      });

      expect(foundClass).toBe(true);
    });

    test('should return false for non-class nodes', () => {
      const testFile = path.join(TEST_DIR, 'non-class.ts');
      const testContent = `function myFunc() { return 1; }`;
      fs.writeFileSync(testFile, testContent, 'utf-8');

      const ast = parseFile(testFile);

      traverseAST(ast, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          expect(isClass(node)).toBe(false);
        }
      });
    });
  });
});
