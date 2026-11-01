import { expect, test } from 'claude-code/testing'

const NOW = Date.parse('2026-11-01T12:00:00Z')

const BAND = {
  plugin: 'usage-bars',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
  },
} as const

test('both bars show time left, colour and percentage', async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: {
      startedAt: NOW,
      context: { windowSize: 200_000 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 42, resetsAt: '2026-11-01T14:13:00Z' },
        { kind: 'seven_day', percentUsed: 95.5, resetsAt: '2026-11-04T16:00:00Z' },
      ],
    },
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect((await ui.find({ type: 'Text', text: /2h13m/ }))?.text).toContain('2h13m')
    expect((await ui.find({ type: 'Text', text: /3d04h/ }))?.text).toContain('3d04h')
    expect((await ui.find({ type: 'Text', text: /42%/ }))?.text).toContain('42%')
    expect((await ui.find({ type: 'Text', text: /96%/ }))?.text).toContain('96%')
    await ui.unmount()
  }

  const terminal = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await terminal.find({ type: 'Text', text: /42%/ }))?.props.color).toBe('success')
  expect((await terminal.find({ type: 'Text', text: /96%/ }))?.props.color).toBe('error')
  await terminal.unmount()

  const desktop = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const bars = await desktop.findAll({ type: 'Svg' })
  expect(bars.length).toBe(2)
  expect(String(bars[0]?.props.source)).toContain('width="46.2"')
  expect(String(bars[0]?.props.source)).toContain('#22c55e')
  expect(String(bars[1]?.props.source)).toContain('#ef4444')
  await desktop.unmount()
})
