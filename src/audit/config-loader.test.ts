/**
 * Unit tests for config-loader
 * 
 * Tests configuration loading, validation, and fallback behavior
 * 
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as fc from 'fast-check';
import { loadConfig, getDefaultConfig } from './config-loader';
import { AuditConfig } from './types';

describe('config-loader', () => {
  const testConfigDir = path.join(__dirname, '../../.test-configs');
  const testConfigPath = path.join(testConfigDir, 'test-audit-config.json');

  beforeEach(() => {
    // Create test config directory
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test config files
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
    if (fs.existsSync(testConfigDir)) {
      fs.rmdirSync(testConfigDir, { recursive: true });
    }
  });

  describe('getDefaultConfig', () => {
    it('should return a valid default configuration', () => {
      const config = getDefaultConfig();

      expect(config.enabled).toBe(true);
      expect(config.thresholds.maxCyclomaticComplexity).toBe(10);
      expect(config.thresholds.maxFunctionLines).toBe(50);
      expect(config.thresholds.maxClassMethods).toBe(15);
      expect(config.thresholds.maxClassFields).toBe(10);
      expect(config.thresholds.maxFunctionParams).toBe(5);
      expect(config.thresholds.minDuplicationLines).toBe(5);
      expect(config.excludePaths).toContain('node_modules');
      expect(config.excludePaths).toContain('dist');
      expect(config.disabledRules).toEqual([]);
    });
  });

  describe('loadConfig', () => {
    it('should load a valid configuration file', () => {
      const validConfig: AuditConfig = {
        enabled: true,
        thresholds: {
          maxCyclomaticComplexity: 15,
          maxFunctionLines: 100,
          maxClassMethods: 20,
          maxClassFields: 15,
          maxFunctionParams: 7,
          minDuplicationLines: 10,
        },
        excludePaths: ['node_modules', 'build', '**/*.test.ts'],
        disabledRules: ['rule1', 'rule2'],
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(validConfig, null, 2), 'utf-8');

      const loadedConfig = loadConfig(testConfigPath);

      expect(loadedConfig.enabled).toBe(true);
      expect(loadedConfig.thresholds.maxCyclomaticComplexity).toBe(15);
      expect(loadedConfig.thresholds.maxFunctionLines).toBe(100);
      expect(loadedConfig.thresholds.maxClassMethods).toBe(20);
      expect(loadedConfig.thresholds.maxClassFields).toBe(15);
      expect(loadedConfig.thresholds.maxFunctionParams).toBe(7);
      expect(loadedConfig.thresholds.minDuplicationLines).toBe(10);
      expect(loadedConfig.excludePaths).toEqual(['node_modules', 'build', '**/*.test.ts']);
      expect(loadedConfig.disabledRules).toEqual(['rule1', 'rule2']);
    });

    it('should fallback to default config when file does not exist', () => {
      const nonExistentPath = path.join(testConfigDir, 'non-existent-config.json');
      const loadedConfig = loadConfig(nonExistentPath);
      const defaultConfig = getDefaultConfig();

      expect(loadedConfig).toEqual(defaultConfig);
    });

    it('should fallback to default config when JSON is invalid', () => {
      const invalidJson = '{ "enabled": true, "thresholds": { invalid json }';
      fs.writeFileSync(testConfigPath, invalidJson, 'utf-8');

      const loadedConfig = loadConfig(testConfigPath);
      const defaultConfig = getDefaultConfig();

      expect(loadedConfig).toEqual(defaultConfig);
    });

    it('should merge partial configuration with defaults', () => {
      const partialConfig = {
        thresholds: {
          maxCyclomaticComplexity: 20,
        },
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(partialConfig, null, 2), 'utf-8');

      const loadedConfig = loadConfig(testConfigPath);
      const defaultConfig = getDefaultConfig();

      // Custom threshold should be used
      expect(loadedConfig.thresholds.maxCyclomaticComplexity).toBe(20);
      
      // Other thresholds should use defaults
      expect(loadedConfig.thresholds.maxFunctionLines).toBe(defaultConfig.thresholds.maxFunctionLines);
      expect(loadedConfig.thresholds.maxClassMethods).toBe(defaultConfig.thresholds.maxClassMethods);
      
      // Other properties should use defaults
      expect(loadedConfig.enabled).toBe(defaultConfig.enabled);
      expect(loadedConfig.excludePaths).toEqual(defaultConfig.excludePaths);
    });

    it('should filter out non-string values from excludePaths', () => {
      const configWithInvalidPaths = {
        enabled: true,
        thresholds: {
          maxCyclomaticComplexity: 10,
          maxFunctionLines: 50,
          maxClassMethods: 15,
          maxClassFields: 10,
          maxFunctionParams: 5,
          minDuplicationLines: 5,
        },
        excludePaths: ['node_modules', 123, 'dist', null, 'build'],
        disabledRules: [],
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(configWithInvalidPaths, null, 2), 'utf-8');

      const loadedConfig = loadConfig(testConfigPath);

      // Only string values should be kept
      expect(loadedConfig.excludePaths).toEqual(['node_modules', 'dist', 'build']);
    });

    it('should filter out non-string values from disabledRules', () => {
      const configWithInvalidRules = {
        enabled: true,
        thresholds: {
          maxCyclomaticComplexity: 10,
          maxFunctionLines: 50,
          maxClassMethods: 15,
          maxClassFields: 10,
          maxFunctionParams: 5,
          minDuplicationLines: 5,
        },
        excludePaths: ['node_modules'],
        disabledRules: ['rule1', 456, 'rule2', false, 'rule3'],
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(configWithInvalidRules, null, 2), 'utf-8');

      const loadedConfig = loadConfig(testConfigPath);

      // Only string values should be kept
      expect(loadedConfig.disabledRules).toEqual(['rule1', 'rule2', 'rule3']);
    });

    it('should handle configuration with disabled audit', () => {
      const disabledConfig = {
        enabled: false,
        thresholds: {
          maxCyclomaticComplexity: 10,
          maxFunctionLines: 50,
          maxClassMethods: 15,
          maxClassFields: 10,
          maxFunctionParams: 5,
          minDuplicationLines: 5,
        },
        excludePaths: [],
        disabledRules: [],
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(disabledConfig, null, 2), 'utf-8');

      const loadedConfig = loadConfig(testConfigPath);

      expect(loadedConfig.enabled).toBe(false);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 20: Configuration Threshold Override
     * Feature: code-audit-system, Property 20: Configuration Threshold Override
     * Validates: Requirements 8.3
     * 
     * For any threshold value defined in the configuration file, 
     * the system should use that value instead of the default when evaluating rules.
     */
    test('Property 20: Configuration Threshold Override', () => {
      fc.assert(
        fc.property(
          fc.record({
            maxCyclomaticComplexity: fc.integer({ min: 1, max: 100 }),
            maxFunctionLines: fc.integer({ min: 10, max: 500 }),
            maxClassMethods: fc.integer({ min: 5, max: 100 }),
            maxClassFields: fc.integer({ min: 5, max: 100 }),
            maxFunctionParams: fc.integer({ min: 1, max: 20 }),
            minDuplicationLines: fc.integer({ min: 1, max: 50 }),
          }),
          (thresholds) => {
            // Create a config file with random threshold values
            const customConfig = {
              enabled: true,
              thresholds,
              excludePaths: ['node_modules'],
              disabledRules: [],
            };

            const testPath = path.join(testConfigDir, `property-test-${Date.now()}-${Math.random()}.json`);
            
            try {
              // Ensure directory exists
              if (!fs.existsSync(testConfigDir)) {
                fs.mkdirSync(testConfigDir, { recursive: true });
              }

              // Write config file
              fs.writeFileSync(testPath, JSON.stringify(customConfig, null, 2), 'utf-8');

              // Load config
              const loadedConfig = loadConfig(testPath);

              // Verify that all custom threshold values are used instead of defaults
              const allThresholdsMatch = 
                loadedConfig.thresholds.maxCyclomaticComplexity === thresholds.maxCyclomaticComplexity &&
                loadedConfig.thresholds.maxFunctionLines === thresholds.maxFunctionLines &&
                loadedConfig.thresholds.maxClassMethods === thresholds.maxClassMethods &&
                loadedConfig.thresholds.maxClassFields === thresholds.maxClassFields &&
                loadedConfig.thresholds.maxFunctionParams === thresholds.maxFunctionParams &&
                loadedConfig.thresholds.minDuplicationLines === thresholds.minDuplicationLines;

              // Clean up
              if (fs.existsSync(testPath)) {
                fs.unlinkSync(testPath);
              }

              return allThresholdsMatch;
            } catch (error) {
              // Clean up on error
              if (fs.existsSync(testPath)) {
                fs.unlinkSync(testPath);
              }
              throw error;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
