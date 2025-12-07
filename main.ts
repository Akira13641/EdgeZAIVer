// Bootstrap function called when DOM is ready
export function bootstrap() {
  // Game instance will be created by React App component
  console.log('EDGE Game Bootstrap Complete');
}

// Auto-bootstrap when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}