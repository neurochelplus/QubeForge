/**
 * AST Utilities for Code Audit System
 * 
 * This module provides utility functions for working with TypeScript Abstract Syntax Trees (AST).
 * It includes functions for parsing files, traversing AST nodes, and identifying node types.
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Parses a TypeScript file into an Abstract Syntax Tree (AST)
 * 
 * @param filePath - Path to the TypeScript file to parse
 * @returns The parsed SourceFile AST node
 * @throws Error if the file cannot be read
 */
export function parseFile(filePath: string): ts.SourceFile {
  const absolutePath = path.resolve(filePath);
  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  
  return ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true // setParentNodes - enables parent node references
  );
}

/**
 * Traverses an AST node and all its descendants, calling the visitor function for each node
 * 
 * @param node - The root node to start traversal from
 * @param visitor - Function to call for each node in the tree
 */
export function traverseAST(node: ts.Node, visitor: (node: ts.Node) => void): void {
  visitor(node);
  ts.forEachChild(node, (child) => traverseAST(child, visitor));
}

/**
 * Gets the line and column position of a node in the source file
 * 
 * @param node - The AST node to get the location for
 * @returns Object containing line and column numbers (1-indexed)
 */
export function getNodeLocation(node: ts.Node): { line: number; column: number } {
  const sourceFile = node.getSourceFile();
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  
  return {
    line: position.line + 1, // Convert to 1-indexed
    column: position.character + 1, // Convert to 1-indexed
  };
}

/**
 * Checks if a node represents a function (function declaration, arrow function, or method)
 * 
 * @param node - The AST node to check
 * @returns true if the node is a function, false otherwise
 */
export function isFunction(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node)
  );
}

/**
 * Checks if a node represents a class declaration
 * 
 * @param node - The AST node to check
 * @returns true if the node is a class, false otherwise
 */
export function isClass(node: ts.Node): boolean {
  return ts.isClassDeclaration(node);
}
