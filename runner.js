const cp = require('child_process');
try {
  const result = cp.execSync('node client/serverTest.js');
  console.log(result.toString());
} catch(e) {
  const fs = require('fs');
  fs.writeFileSync('client/test_err.txt', e.stdout.toString() + '\\n' + e.stderr.toString());
  console.log('Error written to test_err.txt');
}
