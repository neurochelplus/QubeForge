/**
 * Core types for the Code Audit System
 * 
 * This module defines the fundamental data structures used throughout
 * the audit system for representing issues, configuration, results, and metrics.
 */

/**
 * Types of issues that can be detected during code analysis
 */
export enum IssueType {
  Style = 'style',
  Readability = 'readability',
  Duplication = 'duplication',
  DeadCode = 'dead-code',
  Architecture = 'architecture',
}

/**
 * Severity levels for audit issues
 */
export enum Severity {
  Critical = 'critical',
  Important = 'important',
  Minor = 'minor',
}

/**
 * Represents a single code quality issue detected during analysis
 */
export interface AuditIssue {
  /** Type of the issue */
  type: IssueType;
  
  /** Severity level of the issue */
  severity: Severity;
  
  /** File path where the issue was found */
  file: string;
  
  /** Line number where the issue occurs */
  line: number;
  
  /** Optional column number for precise location */
  column?: number;
  
  /** Human-readable description of the issue */
  message: string;
  
  /** Optional suggestion for fixing the issue */
  suggestion?: string;
}

/**
 * Configuration for the audit system
 */
export interface AuditConfig {
  /** Whether the audit system is enabled */
  enabled: boolean;
  
  /** Threshold values for various code metrics */
  thresholds: {
    /** Maximum allowed cyclomatic complexity for functions */
    maxCyclomaticComplexity: number;
    
    /** Maximum allowed lines of code in a function */
    maxFunctionLines: number;
    
    /** Maximum allowed methods in a class */
    maxClassMethods: number;
    
    /** Maximum allowed fields in a class */
    maxClassFields: number;
    
    /** Maximum allowed parameters in a function */
    maxFunctionParams: number;
    
    /** Minimum lines required to consider code as duplicated */
    minDuplicationLines: number;
  };
  
  /** Paths to exclude from analysis (glob patterns) */
  excludePaths: string[];
  
  /** Rules to disable during analysis */
  disabledRules: string[];
}

/**
 * Aggregated metrics from the audit analysis
 */
export interface AuditMetrics {
  /** Total number of issues found */
  totalIssues: number;
  
  /** Count of issues by type */
  issuesByType: Record<IssueType, number>;
  
  /** Count of issues by severity */
  issuesBySeverity: Record<Severity, number>;
  
  /** Percentage of code that is duplicated */
  duplicationPercentage: number;
  
  /** Average cyclomatic complexity across all functions */
  averageComplexity: number;
  
  /** Files with the most issues */
  topProblematicFiles: Array<{ file: string; issueCount: number }>;
}

/**
 * Complete result of an audit analysis
 */
export interface AuditResult {
  /** Timestamp when the audit was performed */
  timestamp: Date;
  
  /** Number of files that were analyzed */
  filesAnalyzed: number;
  
  /** All issues found during analysis */
  issues: AuditIssue[];
  
  /** Aggregated metrics from the analysis */
  metrics: AuditMetrics;
}
