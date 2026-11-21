/**
 * SVGR component template. `search.svg` → `SearchIcon`.
 * The generated file is fully typed and has no runtime dependency besides React.
 */
module.exports = function iconTemplate(variables, { tpl }) {
  const name = `${variables.componentName.replace(/^Svg/, "")}Icon`
  return tpl`
import type { IconProps } from "../types"

const ${name} = ({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  absoluteStrokeWidth = false,
  title,
  titleId,
  ...props
}: IconProps) => ${variables.jsx}

export default ${name}
`
}
