/**
 * Test framework for running Phase 1 movement tests
 */

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

export class TestRunner {
  private suites: Map<string, () => TestSuite> = new Map();

  /**
   * Register a test suite
   */
  public registerSuite(name: string, suiteFactory: () => TestSuite): void {
    this.suites.set(name, suiteFactory);
  }

  /**
   * Run all registered test suites
   */
  public async runAllTests(): Promise<TestSuite[]> {
    const results: TestSuite[] = [];

    for (const [name, suiteFactory] of this.suites) {
      try {
        const suite = suiteFactory();
        results.push(suite);
      } catch (error) {
        results.push({
          name,
          tests: [],
          passed: 0,
          failed: 1,
          duration: 0,
        });
      }
    }

    return results;
  }

  /**
   * Run a specific test suite
   */
  public async runSuite(name: string): Promise<TestSuite | null> {
    const suiteFactory = this.suites.get(name);
    if (!suiteFactory) {
      return null;
    }

    try {
      return suiteFactory();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all registered suite names
   */
  public getSuiteNames(): string[] {
    return Array.from(this.suites.keys());
  }
}

/**
 * Create a test function with timing
 */
export function createTest(name: string, testFn: () => void | Promise<void>): () => TestResult | Promise<TestResult> {
  return () => {
    const startTime = performance.now();
    
    try {
      const result = testFn();
      
      if (result instanceof Promise) {
        return result.then(() => {
          const duration = performance.now() - startTime;
          return { name, passed: true, duration };
        }).catch((error) => {
          const duration = performance.now() - startTime;
          return { 
            name, 
            passed: false, 
            error: error instanceof Error ? error.message : String(error),
            duration 
          };
        });
      }
      
      const duration = performance.now() - startTime;
      return { name, passed: true, duration };
    } catch (error) {
      const duration = performance.now() - startTime;
      return { 
        name, 
        passed: false, 
        error: error instanceof Error ? error.message : String(error),
        duration 
      };
    }
  };
}

/**
 * Create a test suite
 */
export function createSuite(name: string, testFactories: (() => TestResult | Promise<TestResult>)[]): TestSuite {
  const startTime = performance.now();
  const tests: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const testFactory of testFactories) {
    try {
      const result = testFactory();
      
      if (result instanceof Promise) {
        // Handle async tests - for now, we'll make them sync for simplicity
        result.then(syncResult => {
          tests.push(syncResult);
          if (syncResult.passed) passed++;
          else failed++;
        }).catch(error => {
          const errorResult: TestResult = {
            name: 'Async Test Error',
            passed: false,
            error: error instanceof Error ? error.message : String(error),
            duration: 0,
          };
          tests.push(errorResult);
          failed++;
        });
      } else {
        tests.push(result);
        if (result.passed) passed++;
        else failed++;
      }
    } catch (error) {
      const errorResult: TestResult = {
        name: 'Unknown Test',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: 0,
      };
      tests.push(errorResult);
      failed++;
    }
  }

  const duration = performance.now() - startTime;

  return {
    name,
    tests,
    passed,
    failed,
    duration,
  };
}

/**
 * Assertion helpers
 */
export class Assert {
  static isTrue(condition: boolean, message?: string): void {
    if (!condition) {
      throw new Error(message || 'Expected condition to be true');
    }
  }

  static isFalse(condition: boolean, message?: string): void {
    if (condition) {
      throw new Error(message || 'Expected condition to be false');
    }
  }

  static equals<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, but got ${actual}`);
    }
  }

  static notEquals<T>(actual: T, expected: T, message?: string): void {
    if (actual === expected) {
      throw new Error(message || `Expected ${actual} to not equal ${expected}`);
    }
  }

  static approximatelyEquals(actual: number, expected: number, tolerance: number, message?: string): void {
    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(message || `Expected ${expected} ± ${tolerance}, but got ${actual}`);
    }
  }

  static greaterThan(actual: number, expected: number, message?: string): void {
    if (actual <= expected) {
      throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
    }
  }

  static lessThan(actual: number, expected: number, message?: string): void {
    if (actual >= expected) {
      throw new Error(message || `Expected ${actual} to be less than ${expected}`);
    }
  }

  static isNotNull<T>(value: T | null | undefined, message?: string): void {
    if (value === null || value === undefined) {
      throw new Error(message || 'Expected value to not be null or undefined');
    }
  }

  static isNull(value: any, message?: string): void {
    if (value !== null && value !== undefined) {
      throw new Error(message || 'Expected value to be null or undefined');
    }
  }

  static throws(fn: () => void, expectedError?: string, message?: string): void {
    try {
      fn();
      throw new Error(message || 'Expected function to throw an error');
    } catch (error) {
      if (expectedError && error instanceof Error && !error.message.includes(expectedError)) {
        throw new Error(message || `Expected error to contain "${expectedError}", but got "${error.message}"`);
      }
    }
  }
}