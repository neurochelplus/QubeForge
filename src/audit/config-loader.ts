/**
 * Configuration loader for the Code Audit System
 * 
 * This module handles loading and validating audit configuration from JSON files,
 * with fallback to default values when configuration is missing or invalid.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AuditConfig } from './types';

/**
 * Returns the default audit configuration
 * 
 * These defaults are used when no configuration file is found or when
 * the configuration file is invalid.
 * 
 * @returns Default AuditConfig with sensible threshold values
 */
export function getDefaultConfig(): AuditConfig {
  return {
    enabled: true,
    thresholds: {
      maxCyclomaticComplexity: 10,
      maxFunctionLines: 50,
      maxClassMethods: 15,
      maxClassFields: 10,
      maxFunctionParams: 5,
      minDuplicationLines: 5,
    },
    excludePaths: [
      'node_modules',
      'dist',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
    disabledRules: [],
  };
}

/**
 * Loads audit configuration from a JSON file
 * 
 * If the file doesn't exist or contains invalid JSON, falls back to default configuration.
 * Validates that the loaded configuration has the correct structure.
 * 
 * @param configPath - Path to the configuration JSON file
 * @returns Loaded AuditConfig or default config if loading fails
 */
export function loadConfig(configPath: string): AuditConfig {
  try {
    // Check if file exists
    if (!fs.existsSync(configPath)) {
      console.warn(`Configuration file not found at ${configPath}, using default configuration`);
      return getDefaultConfig();
    }

    // Read file content
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    
    // Parse JSON
    let parsedConfig: any;
    try {
      parsedConfig = JSON.parse(fileContent);
    } catch (parseError) {
      console.warn(`Invalid JSON in configuration file ${configPath}, using default configuration`);
      console.warn(`Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      return getDefaultConfig();
    }

    // Validate and merge with defaults
    const defaultConfig = getDefaultConfig();
    const config: AuditConfig = {
      enabled: typeof parsedConfig.enabled === 'boolean' ? parsedConfig.enabled : defaultConfig.enabled,
      thresholds: {
        maxCyclomaticComplexity: 
          typeof parsedConfig.thresholds?.maxCyclomaticComplexity === 'number' 
            ? parsedConfig.thresholds.maxCyclomaticComplexity 
            : defaultConfig.thresholds.maxCyclomaticComplexity,
        maxFunctionLines: 
          typeof parsedConfig.thresholds?.maxFunctionLines === 'number' 
            ? parsedConfig.thresholds.maxFunctionLines 
            : defaultConfig.thresholds.maxFunctionLines,
        maxClassMethods: 
          typeof parsedConfig.thresholds?.maxClassMethods === 'number' 
            ? parsedConfig.thresholds.maxClassMethods 
            : defaultConfig.thresholds.maxClassMethods,
        maxClassFields: 
          typeof parsedConfig.thresholds?.maxClassFields === 'number' 
            ? parsedConfig.thresholds.maxClassFields 
            : defaultConfig.thresholds.maxClassFields,
        maxFunctionParams: 
          typeof parsedConfig.thresholds?.maxFunctionParams === 'number' 
            ? parsedConfig.thresholds.maxFunctionParams 
            : defaultConfig.thresholds.maxFunctionParams,
        minDuplicationLines: 
          typeof parsedConfig.thresholds?.minDuplicationLines === 'number' 
            ? parsedConfig.thresholds.minDuplicationLines 
            : defaultConfig.thresholds.minDuplicationLines,
      },
      excludePaths: Array.isArray(parsedConfig.excludePaths) 
        ? parsedConfig.excludePaths.filter((p: any) => typeof p === 'string')
        : defaultConfig.excludePaths,
      disabledRules: Array.isArray(parsedConfig.disabledRules) 
        ? parsedConfig.disabledRules.filter((r: any) => typeof r === 'string')
        : defaultConfig.disabledRules,
    };

    return config;
  } catch (error) {
    console.warn(`Error loading configuration from ${configPath}, using default configuration`);
    console.warn(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return getDefaultConfig();
  }
}
