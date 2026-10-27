import assert from "node:assert/strict";
import test from "node:test";
import { deriveChange } from "../build/model.mjs";

test("stage derivation keeps empty task sets ready and includes skipped custom dependencies", () => {
  const base = {
    id: "example",
    goal: null,
    artifacts: [
      { id: "proposal", status: "skipped", requires: [], outputPath: "proposal.md" },
      { id: "tasks", status: "done", requires: ["proposal"], outputPath: "tasks.md" },
    ],
    applyRequires: ["tasks"],
  };
  assert.equal(deriveChange({ ...base, completedTasks: 0, totalTasks: 0 }).stage, "ready");
  assert.equal(deriveChange({ ...base, completedTasks: 1, totalTasks: 2 }).stage, "progress");
  assert.equal(deriveChange({ ...base, completedTasks: 2, totalTasks: 2 }).stage, "complete");
  assert.equal(deriveChange({ ...base, completedTasks: 2, totalTasks: 2 }).completedArtifacts, 2);
  assert.equal(
    deriveChange({
      ...base,
      artifacts: [{ ...base.artifacts[0], status: "ready" }, base.artifacts[1]],
      completedTasks: 2,
      totalTasks: 2,
    }).stage,
    "planning",
  );
});

test("post-apply artefacts gate completion without dragging the stage back to planning", () => {
  const flow = {
    id: "traceable",
    goal: null,
    artifacts: [
      { id: "research", status: "done", requires: [], outputPath: "research.md" },
      { id: "proposal", status: "done", requires: ["research"], outputPath: "proposal.md" },
      { id: "specs", status: "done", requires: ["proposal"], outputPath: "specs/a/spec.md" },
      { id: "design", status: "done", requires: ["proposal"], outputPath: "design.md" },
      { id: "adr", status: "done", requires: ["design"], outputPath: "adr.md" },
      {
        id: "tasks",
        status: "done",
        requires: ["specs", "design", "adr"],
        outputPath: "tasks.md",
      },
      { id: "findings", status: "ready", requires: ["tasks"], outputPath: "findings.md" },
      {
        id: "verification",
        status: "ready",
        requires: ["tasks"],
        outputPath: "verification.md",
      },
    ],
    applyRequires: ["tasks"],
  };
  const pending = deriveChange({ ...flow, completedTasks: 2, totalTasks: 2 });
  assert.equal(pending.totalArtifacts, 8);
  assert.equal(pending.completedArtifacts, 6);
  assert.equal(pending.stage, "progress");
  const done = deriveChange({
    ...flow,
    artifacts: flow.artifacts.map((artifact) => ({ ...artifact, status: "done" })),
    completedTasks: 2,
    totalTasks: 2,
  });
  assert.equal(done.stage, "complete");
  assert.equal(done.completedArtifacts, 8);
});
