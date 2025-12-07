import React, { useEffect, useRef, useState } from 'react';
import { Game } from './core/Game';
import { TestRunner, TestSuite } from './tests/TestFramework';
import { createPhase1TestSuite } from './tests/phase1_movement.test';

declare global {
  interface Window {
    game: Game | null;
  }
}

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentView, setCurrentView] = useState<'menu' | 'game' | 'tests'>('menu');
  const gameRef = useRef<Game | null>(null);
  
  // Test runner state
  const [testRunner] = useState(() => new TestRunner());
  const [testResults, setTestResults] = useState<TestSuite[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<string>('Phase 1 Movement Tests');

  // Register test suites
  useEffect(() => {
    testRunner.registerSuite('Phase 1 Movement Tests', createPhase1TestSuite());
  }, [testRunner]);

  useEffect(() => {
    if (currentView === 'game' && canvasRef.current && !gameRef.current) {
      // Initialize game
      gameRef.current = new Game(canvasRef.current);
      window.game = gameRef.current;
      
      // Start game loop
      gameRef.current.start();
    }

    return () => {
      if (gameRef.current && currentView !== 'game') {
        gameRef.current.stop();
        gameRef.current = null;
        window.game = null;
      }
    };
  }, [currentView]);

  const renderMenu = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      color: 'white',
      gap: '20px'
    }}>
      <h1 style={{ fontSize: '48px', margin: 0 }}>EDGE</h1>
      <p style={{ fontSize: '18px', opacity: 0.7 }}>2D Soulslike Side-Scroller</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={() => setCurrentView('game')}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: '#333',
            color: 'white',
            border: '2px solid #555',
            cursor: 'pointer',
            borderRadius: '5px'
          }}
        >
          Start Game
        </button>
        
        <button
          onClick={() => setCurrentView('tests')}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: '#333',
            color: 'white',
            border: '2px solid #555',
            cursor: 'pointer',
            borderRadius: '5px'
          }}
        >
          Run Tests
        </button>
      </div>
    </div>
  );

  const renderGame = () => (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1a1a1a'
        }}
      />
      <button
        onClick={() => setCurrentView('menu')}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          fontSize: '14px',
          backgroundColor: '#333',
          color: 'white',
          border: '2px solid #555',
          cursor: 'pointer',
          borderRadius: '5px'
        }}
      >
        Back to Menu
      </button>
    </div>
  );

  const renderTests = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      height: '100vh',
      color: 'white',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <h2 style={{ marginBottom: '30px' }}>Test Runner</h2>
      
      {/* Test Controls */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '30px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <select
          value={selectedSuite}
          onChange={(e) => setSelectedSuite(e.target.value)}
          disabled={isRunningTests}
          style={{
            padding: '10px',
            fontSize: '14px',
            backgroundColor: '#333',
            color: 'white',
            border: '2px solid #555',
            borderRadius: '5px',
            minWidth: '200px'
          }}
        >
          {testRunner.getSuiteNames().map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        
        <button
          onClick={() => runAllTests()}
          disabled={isRunningTests}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: isRunningTests ? '#666' : '#28a745',
            color: 'white',
            border: '2px solid #555',
            cursor: isRunningTests ? 'not-allowed' : 'pointer',
            borderRadius: '5px'
          }}
        >
          {isRunningTests ? 'Running...' : 'Run All Tests'}
        </button>
        
        <button
          onClick={() => runSelectedSuite()}
          disabled={isRunningTests}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: isRunningTests ? '#666' : '#007bff',
            color: 'white',
            border: '2px solid #555',
            cursor: isRunningTests ? 'not-allowed' : 'pointer',
            borderRadius: '5px'
          }}
        >
          {isRunningTests ? 'Running...' : 'Run Selected'}
        </button>
        
        <button
          onClick={() => clearResults()}
          disabled={isRunningTests}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: isRunningTests ? '#666' : '#dc3545',
            color: 'white',
            border: '2px solid #555',
            cursor: isRunningTests ? 'not-allowed' : 'pointer',
            borderRadius: '5px'
          }}
        >
          Clear Results
        </button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div style={{
          width: '100%',
          maxWidth: '1200px',
          backgroundColor: '#2a2a2a',
          borderRadius: '10px',
          padding: '20px',
          border: '1px solid #555'
        }}>
          {/* Summary */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#333',
            borderRadius: '5px'
          }}>
            <h3 style={{ margin: 0 }}>Test Summary</h3>
            <div style={{ display: 'flex', gap: '20px' }}>
              <span style={{ color: '#28a745' }}>
                Passed: {testResults.reduce((sum, suite) => sum + suite.passed, 0)}
              </span>
              <span style={{ color: '#dc3545' }}>
                Failed: {testResults.reduce((sum, suite) => sum + suite.failed, 0)}
              </span>
              <span style={{ color: '#ffc107' }}>
                Total: {testResults.reduce((sum, suite) => sum + suite.tests.length, 0)}
              </span>
              <span style={{ color: '#17a2b8' }}>
                Time: {(testResults.reduce((sum, suite) => sum + suite.duration, 0) / 1000).toFixed(2)}s
              </span>
            </div>
          </div>

          {/* Individual Test Suites */}
          {testResults.map((suite, suiteIndex) => (
            <div key={suiteIndex} style={{
              marginBottom: '20px',
              border: '1px solid #555',
              borderRadius: '5px',
              overflow: 'hidden'
            }}>
              {/* Suite Header */}
              <div style={{
                padding: '15px',
                backgroundColor: suite.failed === 0 ? '#28a74520' : '#dc354520',
                borderBottom: '1px solid #555',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h4 style={{ margin: 0 }}>
                  {suite.name}
                  {suite.failed === 0 ? (
                    <span style={{ color: '#28a745', marginLeft: '10px' }}>✓ PASSED</span>
                  ) : (
                    <span style={{ color: '#dc3545', marginLeft: '10px' }}>✗ FAILED</span>
                  )}
                </h4>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                  {suite.passed}/{suite.tests.length} passed • {(suite.duration / 1000).toFixed(3)}s
                </div>
              </div>

              {/* Test Cases */}
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {suite.tests.map((test, testIndex) => (
                  <div key={testIndex} style={{
                    padding: '10px 15px',
                    borderBottom: testIndex < suite.tests.length - 1 ? '1px solid #444' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    backgroundColor: testIndex % 2 === 0 ? '#2a2a2a' : 'transparent'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: test.error ? '5px' : '0'
                      }}>
                        <span style={{
                          color: test.passed ? '#28a745' : '#dc3545',
                          marginRight: '10px',
                          fontSize: '16px'
                        }}>
                          {test.passed ? '✓' : '✗'}
                        </span>
                        <span style={{ 
                          color: test.passed ? '#ffffff' : '#dc3545',
                          fontFamily: 'monospace',
                          fontSize: '13px'
                        }}>
                          {test.name}
                        </span>
                      </div>
                      {test.error && (
                        <div style={{
                          color: '#ff6b6b',
                          fontSize: '12px',
                          marginLeft: '26px',
                          fontFamily: 'monospace',
                          backgroundColor: '#dc354520',
                          padding: '5px',
                          borderRadius: '3px',
                          border: '1px solid #dc3545'
                        }}>
                          Error: {test.error}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      opacity: 0.6,
                      fontFamily: 'monospace',
                      marginLeft: '10px'
                    }}>
                      {(test.duration / 1000).toFixed(3)}s
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {testResults.length === 0 && !isRunningTests && (
        <div style={{
          textAlign: 'center',
          opacity: 0.7,
          marginTop: '50px'
        }}>
          <p>No test results yet. Select a test suite and click "Run Tests" to begin.</p>
        </div>
      )}
      
      <button
        onClick={() => setCurrentView('menu')}
        style={{
          marginTop: '30px',
          padding: '15px 30px',
          fontSize: '16px',
          backgroundColor: '#333',
          color: 'white',
          border: '2px solid #555',
          cursor: 'pointer',
          borderRadius: '5px'
        }}
      >
        Back to Menu
      </button>
    </div>
  );

  /**
   * Run all test suites
   */
  const runAllTests = async () => {
    setIsRunningTests(true);
    try {
      const results = await testRunner.runAllTests();
      setTestResults(results);
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  /**
   * Run selected test suite
   */
  const runSelectedSuite = async () => {
    setIsRunningTests(true);
    try {
      const result = await testRunner.runSuite(selectedSuite);
      if (result) {
        setTestResults([result]);
      }
    } catch (error) {
      console.error('Error running test suite:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  /**
   * Clear test results
   */
  const clearResults = () => {
    setTestResults([]);
  };

  switch (currentView) {
    case 'menu':
      return renderMenu();
    case 'game':
      return renderGame();
    case 'tests':
      return renderTests();
    default:
      return renderMenu();
  }
};