const fs = require('fs');
let code = fs.readFileSync('src/components/camera/CameraCaptureModal.tsx', 'utf8');

const regex = /const stream = await navigator\.mediaDevices\.getUserMedia\(\{\s*video: \{\s*facingMode: \{\s*ideal: facingMode\s*\},[^}]+\},\s*audio: false,\s*\}\);/;

const fallback = `
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
        } catch (initialErr) {
          console.warn('Initial camera constraints failed, falling back to basic video:', initialErr);
          // Fallback without resolution constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
            audio: false,
          });
        }`;

code = code.replace(regex, fallback);
fs.writeFileSync('src/components/camera/CameraCaptureModal.tsx', code);
