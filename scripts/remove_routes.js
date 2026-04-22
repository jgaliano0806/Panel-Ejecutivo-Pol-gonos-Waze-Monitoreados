const fs = require("fs");
let code = fs.readFileSync("apps/backend/src/server.ts", "utf8");

const endpointsToRemove = [
  "/api/road-accidents/map",
  "/api/kpis/global",
  "/api/traffic-metrics",
  "/api/traffic-metrics/:polygonId",
  "/api/tvt-metrics",
  "/api/tvt-metrics/:polygonId",
  "/api/alerts",
  "/api/alerts/stats",
  "/api/alerts/severity/:severity",
  "/api/alerts/polygon/:polygonId",
  "/api/alerts/:alertId/acknowledge",
  "/api/metrics/global",
  "/api/metrics/top-critical",
  "/api/historical/global",
  "/api/historical/polygon/:polygonId",
  "/api/historical/trends",
  "/api/historical/availability",
  "/api/data-quality/report",
  "/api/data-quality/metrics",
  "/api/data-quality/incidents/high-quality",
  "/api/data-quality/incidents/prioritized",
  "/api/data-quality/incidents/stale",
  "/api/data-quality/feed-status",
  "/api/data-quality/thresholds",
  "/api/incidents/stats/global",
  "/api/incidents/stats/polygon/:polygonId",
  "/api/incidents/types-summary",
  "/api/incidents/delay/:incidentId",
  "/api/incidents/delays/all",
];

for (let ep of endpointsToRemove) {
  // Try to find the block manually
  let searchRaw = `server.get("${ep}",`;
  let searchType = `server.post<{ Body: ThresholdsUpdate }>("${ep}",`;
  if (ep.includes('acknowledge')) {
     searchRaw = `server.post("${ep}",`;
  }
  
  let idx = code.indexOf(searchRaw);
  if (idx === -1) idx = code.indexOf(searchType);
  if (idx === -1) {
    // Try wrapping string
    searchRaw = `server.get(\n  "${ep}"`;
    idx = code.indexOf(searchRaw);
  }
  
  if (idx !== -1) {
    // Find the end:
    // We count open { and close }
    let braceCount = 0;
    let started = false;
    let endIdx = idx;
    for (let i = idx; i < code.length; i++) {
        if (code[i] === "{") {
            braceCount++;
            started = true;
        } else if (code[i] === "}") {
            braceCount--;
        }
        
        if (started && braceCount === 0) {
            // Find the trailing );
            let tail = code.substring(i, i+10);
            let nextParen = tail.indexOf(");");
            if (nextParen !== -1) {
                endIdx = i + nextParen + 2;
                break;
            } else if (tail.includes(",")) {
               // maybe it's } ,
               let endParen = tail.indexOf(")");
               if (endParen !== -1) {
                   endIdx = i + endParen + 1;
                   if (code[endIdx] === ';') endIdx++;
                   break;
               }
            }
            
            endIdx = i + 1;
            break;
        }
    }
    
    // Delete from idx to endIdx
    // Also remove the preceding comment if it exists easily? Let's just remove the block.
    code = code.substring(0, idx) + code.substring(endIdx);
    console.log("Removed: " + ep);
  } else {
    console.log("Could not find: " + ep);
  }
}
fs.writeFileSync("apps/backend/src/server.ts", code);
console.log("Done.");
