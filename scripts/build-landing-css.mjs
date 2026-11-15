import fs from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import prefix from "postcss-prefix-selector";

// Keep the supplied reference's utility classes, without leaking its reset,
// typography or utility rules into the scientific planner.
const base = path.resolve("components/landing");
const input = path.join(base, "landing.source.css");
const compiled = await postcss([tailwind({ base, optimize: false })]).process(
  await fs.readFile(input, "utf8"), { from: input },
);
compiled.root.walkAtRules("layer", rule => {
  if (rule.nodes) rule.replaceWith(...rule.nodes);
  else rule.remove();
});
const scoped = await postcss([prefix({
  prefix: ".aresian-landing",
  transform(scope, selector, prefixed, file, rule) {
    if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name)) return selector;
    if ([":root", ":host", "html", "body"].includes(selector)) return scope;
    return prefixed;
  },
})]).process(compiled.root.toString(), { from: input });
await fs.writeFile(path.join(base, "landing.generated.css"), scoped.css);
