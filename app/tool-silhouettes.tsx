import TOOL_SOURCE from "../tools/brand/tool-silhouettes.json";
import styles from "./tool-silhouettes.module.css";

/**
 * Original TRADE HUSTL3 tool silhouettes. The shapes live in
 * tools/brand/tool-silhouettes.json, which also generates the background
 * tiles in public/brand/ (see tools/brand/build-tool-patterns.py).
 * All art here is decorative and hidden from assistive technology.
 */
export type ToolName = Exclude<keyof typeof TOOL_SOURCE, "_comment">;

const TOOLS = TOOL_SOURCE as Record<ToolName, string>;

export const RAIL_TOOLS: readonly ToolName[] = [
  "wrench", "gauge", "hammer", "multimeter", "pipewrench", "hardhat",
  "drill", "pliers", "level", "screwdriver", "tape", "helmet",
];

export function ToolSilhouette({ name, size = 48, className }: { name: ToolName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      // Static, trusted markup from the repo's own JSON source.
      dangerouslySetInnerHTML={{ __html: TOOLS[name] }}
    />
  );
}

/** A bold strip of gold tool silhouettes, used as a section divider. */
export function ToolRail({ tone = "navy" }: { tone?: "navy" | "red" }) {
  return (
    <div className={styles.rail} data-tone={tone} aria-hidden="true">
      <div className={styles.railTrack}>
        {[...RAIL_TOOLS, ...RAIL_TOOLS].map((name, index) => (
          <ToolSilhouette key={`${name}-${index}`} name={name} size={40} className={styles.railTool} />
        ))}
      </div>
    </div>
  );
}

/** Large crossed wrench and hammer for the right side of a dark hero. */
export function ToolHeroArt() {
  return (
    <div className={styles.heroArt} aria-hidden="true">
      <span className={styles.heroGlow} />
      <ToolSilhouette name="wrench" size={300} className={styles.heroWrench} />
      <ToolSilhouette name="hammer" size={300} className={styles.heroHammer} />
      <ToolSilhouette name="gauge" size={110} className={styles.heroGauge} />
    </div>
  );
}
