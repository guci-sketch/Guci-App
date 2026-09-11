const fs = require('fs');
let code = fs.readFileSync('src/components/executor/ExecutorHome.tsx', 'utf8');

// 1. Add import calculateDistanceMeters
code = code.replace(
  "import { formatDistance } from '../../utils/geo';",
  "import { formatDistance, calculateDistanceMeters } from '../../utils/geo';"
);

// 2. Add useRef to react imports if not present
if (!code.includes('useRef')) {
  code = code.replace(
    "import React, { useState, useEffect, useCallback } from 'react';",
    "import React, { useState, useEffect, useCallback, useRef } from 'react';"
  );
}

// 3. Inject lastLocationRef before trackLocation
if (!code.includes('lastLocationRef')) {
  const refInjection = `  const lastLocationRef = useRef<{ latitude: number; longitude: number; timestamp: number } | null>(null);\n\n  const trackLocation`;
  code = code.replace("  const trackLocation", refInjection);
}

// 4. Replace trackLocation logic
const oldTrackLocationRegex = /const trackLocation = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\);/;

const newTrackLocation = `const trackLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        // Validation step 1: Ensure accuracy radius is reasonable (e.g. within 150 meters)
        if (pos.coords.accuracy > 150) {
          console.warn('GPS rejected: Accuracy too poor (', pos.coords.accuracy, 'm)');
          return;
        }

        // Validation step 2: Prevent unreasonable distance jumps
        const now = Date.now();
        if (lastLocationRef.current) {
          const dist = calculateDistanceMeters(
            { latitude: lastLocationRef.current.latitude, longitude: lastLocationRef.current.longitude },
            { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
          );
          
          // E.g., reject jump > 50km
          if (dist > 50000) {
            console.warn('GPS rejected: Unreasonable distance jump detected (', dist, 'm)');
            return;
          }
        }

        lastLocationRef.current = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: now
        };

        postLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }).catch(err => {
          if (err.status === 0) enqueueGps(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        });
      },
      err => console.warn('Background GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }, []);`;

code = code.replace(oldTrackLocationRegex, newTrackLocation);

fs.writeFileSync('src/components/executor/ExecutorHome.tsx', code);
console.log('ExecutorHome patched');
