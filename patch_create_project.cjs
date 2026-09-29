const fs = require('fs');
let code = fs.readFileSync('src/components/executor/CreateProjectModal.tsx', 'utf8');

// Modify the map picker to pan when locationLat/Lng changes, regardless of locks
code = code.replace(/<MapPicker[\s\S]*?\/>/, `
              <MapPicker 
                latitude={locationLat} 
                longitude={locationLng} 
                onLocationChange={(lat, lng) => {
                  if(!isMapLocked) {
                     setLocationLat(lat);
                     setLocationLng(lng);
                     setIsLocationPicked(true);
                  }
                }}
                readOnly={isMapLocked}
              />
`);

fs.writeFileSync('src/components/executor/CreateProjectModal.tsx', code);
