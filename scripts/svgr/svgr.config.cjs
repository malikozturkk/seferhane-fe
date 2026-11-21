/**
 * SVGR config — converts `src/design-system/icons/svg/*.svg` into typed React
 * components in `src/design-system/icons/generated/`.
 *
 * Run with: npm run icons
 *
 * Every generated icon accepts `size`, `color`, `strokeWidth`,
 * `absoluteStrokeWidth` and `title` (see `src/design-system/icons/types.ts`).
 */
const path = require("node:path")

module.exports = {
  typescript: true,
  jsxRuntime: "automatic",
  icon: false,
  dimensions: false,
  expandProps: "end",
  titleProp: true,
  prettier: true,
  prettierConfig: { semi: false, singleQuote: false, trailingComma: "all" },
  svgo: true,
  svgoConfig: {
    plugins: [
      {
        name: "preset-default",
        params: { overrides: { removeViewBox: false } },
      },
      { name: "removeAttrs", params: { attrs: ["class", "svg:width", "svg:height"] } },
    ],
  },
  // Props on the root <svg>. Values wrapped in {} become JSX expressions.
  svgProps: {
    width: "{size}",
    height: "{size}",
    stroke: "{color}",
    strokeWidth:
      "{absoluteStrokeWidth ? (Number(strokeWidth) * 24) / Number(size) : strokeWidth}",
    "aria-hidden": "{title ? undefined : true}",
    role: "{title ? 'img' : undefined}",
    focusable: "false",
  },
  // Filled glyphs authored with currentColor follow the `color` prop too.
  replaceAttrValues: { currentColor: "{color}" },
  template: require(path.join(__dirname, "icon-template.cjs")),
  indexTemplate: require(path.join(__dirname, "index-template.cjs")),
}
