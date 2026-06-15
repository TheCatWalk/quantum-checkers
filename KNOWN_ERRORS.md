# Known Errors & Anti-Patterns

## WebGL Canvas Layering (CRITICAL)
**Problem**: Multiple independent WebGL canvases (QuantumField, StarField) positioned with `position: fixed` + z-index layering is unreliable. StarField renders nothing despite valid shader code.

**Root Cause**: Z-index doesn't work predictably across multiple canvas elements. Browser compositing varies by GPU/driver.

**Solution**: DON'T create multiple independent WebGL canvases. Instead:
- Use a single WebGL canvas that renders all effects, OR
- Use Phaser's built-in graphics/particle systems, OR
- Use postFX pipelines on the camera

**Lesson**: For layered visual effects, consolidate to one rendering context.

---

## GLSL `gl_FragCoord` Type Mismatch (REPEATED ERROR)
**Problem**: Used `vec2 uv = gl_FragCoord / resolution.xy;` multiple times, causing compile errors.

**Root Cause**: `gl_FragCoord` is `vec4`, not `vec2`.

**Solution**: Always use `gl_FragCoord.xy` when converting to 2D.

**Lesson**: Test shader code in isolation before bundling into classes. Use a GLSL validator.

---

## Architecture: Too Many Independent Systems
**Problem**: QuantumField and StarField are separate classes with duplicate WebGL setup code. Harder to maintain, debug, and coordinate.

**Solution**: Create a single `BackgroundRenderer` class that manages all procedural background layers. Use data-driven config.

**Lesson**: Don't create parallel systems. Consolidate under one coordinator.

---

## Missing Data-Driven Config
**Problem**: Brightness, density, z-indices, colors are hardcoded in shader strings and class constructors. Hard to iterate visually.

**Solution**: All visual parameters should be in `theme.ts` or a dedicated config file.

**Lesson**: Make everything configurable. Playtest-driven design requires easy tweaking.

---

## Not Using Phaser's Built-in Systems
**Problem**: Created raw WebGL canvases instead of using Phaser's graphics, particles, or postFX.

**Root Cause**: Raw WebGL gives more control but is fragile in a Phaser context.

**Solution**: For constellation lines and simple starfield, use Phaser's `Graphics` API. It plays nice with the scene hierarchy.

**Lesson**: Use the engine's abstractions first. Drop to raw WebGL only for complex effects (like the aurora waves).

---

## No Error Recovery
**Problem**: If a shader fails to compile, the entire layer silently disappears with no feedback.

**Solution**: Log shader errors to console, render fallback visuals, or skip the layer gracefully.

**Lesson**: Always have console logging and graceful degradation.
