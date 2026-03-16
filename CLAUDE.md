# kos-kit

## TypeScript Rules

- **No `as` type assertions.** Never use `as` for typecasting. Use type guards (`instanceof`, `in`, `typeof`), narrowing, or fix the types at the source. If a type doesn't fit, the type definition is wrong — fix that instead of casting.
- **No `any`.** Use `unknown` and narrow with type guards.

## Project Structure

- CLI lives in `cli/`
- Tests are co-located next to source files (e.g., `src/lib/api.test.ts` next to `src/lib/api.ts`)
- Uses Bun runtime, Citty for CLI framework, Biome for formatting/linting
- 2-space indentation (configured in `cli/biome.json`)
- Pre-commit hooks via prek (`prek.toml` at repo root)
