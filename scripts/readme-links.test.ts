import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Relative link targets in markdown, skipping code blocks, inline code, URLs and in-page anchors. */
function relativeLinks(markdown: string): string[] {
  const prose = markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`(?!\])/g, '')
  return [...prose.matchAll(/\]\(([^)\s]+)\)/g)]
    .map((m) => m[1])
    .filter((target) => !/^([a-z][a-z0-9+.-]*:|#)/i.test(target))
}

function problem(root: string, target: string): string | null {
  const [path, hash] = target.split('#')
  const file = join(root, path)
  if (!existsSync(file)) return `${target}: file not found`
  const line = hash?.match(/^L(\d+)$/)?.[1]
  if (!line) return null
  const text = readFileSync(file, 'utf8').split(/\r?\n/)[Number(line) - 1]
  if (text === undefined) return `${target}: line does not exist`
  return text.trim() ? null : `${target}: line is empty`
}

test('every relative README link points at a real file and a non-empty line', () => {
  const root = process.cwd()
  const links = relativeLinks(readFileSync(join(root, 'README.md'), 'utf8'))
  expect(links.length).toBeGreaterThan(0)
  expect(links.flatMap((target) => problem(root, target) ?? [])).toEqual([])
})
