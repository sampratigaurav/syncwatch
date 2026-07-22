const { execSync } = require('child_process');

try {
  execSync('npm run build:client', { stdio: 'inherit' });
  console.log('Build successful');
} catch (error) {
  console.error('Build failed', error.message);
  process.exit(1);
}
