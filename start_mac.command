#!/bin/bash
echo "กำลังเริ่มต้นระบบ THE FLOW SYSTEM..."
cd "$(dirname "$0")"
npm install
open http://localhost:3000
npm run dev
