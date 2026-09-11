const fs = require('fs');
let code = fs.readFileSync('src/components/executor/ExecutorHome.tsx', 'utf8');

const replacement = `
  const trackLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        // Validation step 0: Anti-spoofing check
        if (pos.coords.accuracy === 0) {
           console.warn('GPS rejected: Fake GPS detected (accuracy 0)');
           return;
        }

        // Validation step 1: Ensure accuracy radius is reasonable (e.g. within 150 meters)
        if (pos.coords.accuracy > 150) {
`;

code = code.replace(/const trackLocation = useCallback\(\(\) => \{[\s\S]*?if \(pos\.coords\.accuracy > 150\) \{/, replacement.trim());

fs.writeFileSync('src/components/executor/ExecutorHome.tsx', code);
