import assert from "node:assert/strict";
import { formatDate, matchesProject, renderMarkdown, safeUrl } from "../assets/store.js";

assert.equal(formatDate("2026-09-17"), "17 Sept 2026");
assert.equal(safeUrl("javascript:alert(1)"), "#");
assert.match(renderMarkdown("## Setup\n\n- Download it\n- Install it"), /<h3>Setup<\/h3><ul>/);
assert.equal(matchesProject({
  name: "Voxelcraft",
  summary: "A block game",
  category: "Game port",
  compatibility: ["Xbox Series X|S"]
}, "series", "Game port"), true);

console.log("store checks passed");
