#!/bin/bash
# Adding type="button" to buttons in client/src/components/VideoPlayer.tsx
sed -i 's/<button/<button type="button"/g' client/src/components/VideoPlayer.tsx
