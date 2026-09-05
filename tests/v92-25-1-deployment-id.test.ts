import { describe, expect, it } from "vitest";
import { resolveDeploymentId } from "../next.config";

describe("V92.25.1 Vercel deployment identity", () => {
  it("uses Vercel's unique deployment ID without the forbidden prefix", () => {
    const deploymentId = resolveDeploymentId({
      VERCEL_DEPLOYMENT_ID: "dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3",
    });

    expect(deploymentId).toBe("7Gw5ZMBpQA8h9GF832KGp7nwbuh3");
    expect(deploymentId.length).toBeLessThanOrEqual(32);
  });

  it("shortens a 40-character Git SHA when Vercel's deployment ID is unavailable", () => {
    const deploymentId = resolveDeploymentId({
      VERCEL_GIT_COMMIT_SHA: "2e8de4fbcccdfbd422828e10150251add4290d06",
    });

    expect(deploymentId).toBe("2e8de4fbcccdfbd422828e10150251ad");
    expect(deploymentId.length).toBe(32);
  });

  it("rejects an invalid manually configured Next.js deployment ID clearly", () => {
    expect(() => resolveDeploymentId({
      NEXT_DEPLOYMENT_ID: "2e8de4fbcccdfbd422828e10150251add4290d06",
    })).toThrow(/32 characters or fewer/);
  });
});
