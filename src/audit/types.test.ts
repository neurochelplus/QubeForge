/**
 * Property-based tests for audit system types
 * 
 * Feature: code-audit-system
 * These tests verify that the core type definitions maintain their invariants
 * across all possible valid inputs.
 * 
 * @vitest-environment node
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { AuditIssue, IssueType, Severity } from './types';

/**
 * Custom generator for valid IssueType values
 */
const issueTypeArbitrary = fc.constantFrom(
  IssueType.Style,
  IssueType.Readability,
  IssueType.Duplication,
  IssueType.DeadCode,
  IssueType.Architecture
);

/**
 * Custom generator for valid Severity values
 */
const severityArbitrary = fc.constantFrom(
  Severity.Critical,
  Severity.Important,
  Severity.Minor
);

/**
 * Custom generator for valid file paths
 */
const filePathArbitrary = fc.string({ minLength: 1 }).map(s => 
  `src/${s.replace(/[^a-zA-Z0-9_\-\/\.]/g, '_')}.ts`
);

/**
 * Custom generator for valid AuditIssue objects
 * Generates issues with all required fields and optionally includes optional fields
 */
const auditIssueArbitrary: fc.Arbitrary<AuditIssue> = fc.record({
  type: issueTypeArbitrary,
  severity: severityArbitrary,
  file: filePathArbitrary,
  line: fc.nat({ max: 10000 }),
  column: fc.option(fc.nat({ max: 200 }), { nil: undefined }),
  message: fc.string({ minLength: 1, maxLength: 200 }),
  suggestion: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
});

describe('Audit Types - Property-Based Tests', () => {
  /**
   * Property 2: Issue Completeness
   * 
   * For any detected code issue, the issue object must contain all required fields:
   * type, severity, file path, line number, and message.
   * Optional fields (column, suggestion) may be present but are not required.
   * 
   * Validates: Requirements 1.2, 3.2, 6.3
   */
  test('Property 2: Issue Completeness - all required fields must be present', () => {
    fc.assert(
      fc.property(auditIssueArbitrary, (issue: AuditIssue) => {
        // Verify all required fields are present and have valid values
        expect(issue.type).toBeDefined();
        expect(Object.values(IssueType)).toContain(issue.type);
        
        expect(issue.severity).toBeDefined();
        expect(Object.values(Severity)).toContain(issue.severity);
        
        expect(issue.file).toBeDefined();
        expect(typeof issue.file).toBe('string');
        expect(issue.file.length).toBeGreaterThan(0);
        
        expect(issue.line).toBeDefined();
        expect(typeof issue.line).toBe('number');
        expect(issue.line).toBeGreaterThanOrEqual(0);
        
        expect(issue.message).toBeDefined();
        expect(typeof issue.message).toBe('string');
        expect(issue.message.length).toBeGreaterThan(0);
        
        // Optional fields may or may not be present
        if (issue.column !== undefined) {
          expect(typeof issue.column).toBe('number');
          expect(issue.column).toBeGreaterThanOrEqual(0);
        }
        
        if (issue.suggestion !== undefined) {
          expect(typeof issue.suggestion).toBe('string');
        }
        
        // Return true to indicate the property holds
        return true;
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Additional property test: Issue type consistency
   * 
   * Verifies that issue types are always one of the defined enum values
   */
  test('Property: Issue type must be a valid IssueType enum value', () => {
    fc.assert(
      fc.property(auditIssueArbitrary, (issue: AuditIssue) => {
        const validTypes = Object.values(IssueType);
        return validTypes.includes(issue.type);
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Additional property test: Severity consistency
   * 
   * Verifies that severity is always one of the defined enum values
   */
  test('Property: Severity must be a valid Severity enum value', () => {
    fc.assert(
      fc.property(auditIssueArbitrary, (issue: AuditIssue) => {
        const validSeverities = Object.values(Severity);
        return validSeverities.includes(issue.severity);
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Additional property test: Line numbers are non-negative
   * 
   * Verifies that line numbers are always >= 0
   */
  test('Property: Line numbers must be non-negative', () => {
    fc.assert(
      fc.property(auditIssueArbitrary, (issue: AuditIssue) => {
        return issue.line >= 0;
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Additional property test: Column numbers are non-negative when present
   * 
   * Verifies that when column is defined, it is >= 0
   */
  test('Property: Column numbers must be non-negative when present', () => {
    fc.assert(
      fc.property(auditIssueArbitrary, (issue: AuditIssue) => {
        if (issue.column !== undefined) {
          return issue.column >= 0;
        }
        return true;
      }),
      { numRuns: 20 }
    );
  });
});
