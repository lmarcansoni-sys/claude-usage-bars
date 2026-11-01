import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit } from '../types'

const limits = atom({ plugin: 'usage-bars', key: 'limits' } as const, [])
const now = atom({ plugin: 'usage-bars', key: 'now' } as const, 0)

const WINDOWS = [
  { kind: 'five_hour', label: 'Sessão 5h' },
  { kind: 'seven_day', label: 'Semana' },
] as const

// Above this share of a window the bar turns red.
const RED_FROM = 90

const GREEN = '#22c55e'
const RED = '#ef4444'
const TRACK = 'rgba(128,128,128,0.22)'
const BAR_WIDTH = 110
const BAR_HEIGHT = 5

const formatLeft = (ms: number) => {
  const minutes = Math.max(0, Math.ceil(ms / 60_000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60

  if (days > 0) return `${days}d${String(hours).padStart(2, '0')}h`
  if (hours > 0) return `${hours}h${String(mins).padStart(2, '0')}m`

  return `${mins}m`
}

// Drawn at its own pixel size, so the round ends are never scaled flat.
const barSvg = (percent: number, color: string) => {
  const r = BAR_HEIGHT / 2
  // A sliver under the cap's width would draw as a dot past the track's end.
  const filled = percent > 0 ? Math.max(BAR_HEIGHT, (percent / 100) * BAR_WIDTH) : 0

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BAR_WIDTH}" height="${BAR_HEIGHT}" viewBox="0 0 ${BAR_WIDTH} ${BAR_HEIGHT}">` +
    `<rect width="${BAR_WIDTH}" height="${BAR_HEIGHT}" rx="${r}" fill="${TRACK}"/>` +
    (filled > 0
      ? `<rect width="${filled.toFixed(1)}" height="${BAR_HEIGHT}" rx="${r}" fill="${color}"/>`
      : '') +
    `</svg>`
  )
}

const toLimits = (rateLimits: readonly Limit[]): Limit[] =>
  rateLimits.map(({ kind, percentUsed, resetsAt }) => ({ kind, percentUsed, resetsAt }))

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const usage = await $.session.usage()
    const time = await $.clock.now()

    await update($, limits, () => toLimits(usage.rateLimits))
    await update($, now, () => time)

    // Ticks the countdown; the percentages arrive with session.measure.
    $.clock.every(30_000, async () => {
      const t = await $.clock.now()
      await update($, now, () => t)
    })

    return result
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      const time = await $.clock.now()
      await update($, limits, () => toLimits(e.rateLimits))
      await update($, now, () => time)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, limits)
    const time = await read($, now)
    const shown = WINDOWS.flatMap(w => {
      const limit = current.find(l => l.kind === w.kind)

      if (!limit) return []

      const resetAt = limit.resetsAt ? Date.parse(limit.resetsAt) : NaN
      const hasReset = !Number.isNaN(resetAt) && time > 0 && resetAt <= time
      // A window whose reset passed starts over until the next reading.
      const percent = Math.round(hasReset ? 0 : Math.min(100, limit.percentUsed))
      const left = Number.isNaN(resetAt)
        ? '--'
        : hasReset
          ? 'renovado'
          : formatLeft(resetAt - time)

      return [{ ...w, percent, left, isRed: percent > RED_FROM }]
    })

    if (e.props.hasSurvey || shown.length === 0) {
      return next(e)
    }

    if (e.surface === 'desktop') {
      const { Box, Svg, Text } = $.ui.resolve(e)

      return (
        <Box flexDirection="row" gap={4}>
          {shown.map(({ kind, label, percent, left, isRed }) => (
            <Box key={kind} flexDirection="row" alignItems="center" gap={1}>
              <Text size="caption" dimColor tabular>
                {left}
              </Text>
              <Svg
                source={barSvg(percent, isRed ? RED : GREEN)}
                alt={`${label}: ${percent}% usado, renova em ${left}`}
                width={BAR_WIDTH}
                height={BAR_HEIGHT}
              />
              <Text size="caption" tabular>
                {percent}%
              </Text>
            </Box>
          ))}
        </Box>
      )
    }

    // The terminal has no Svg: a thin line of text in the same layout.
    const { Box, Text } = $.ui.resolve(e)
    const perWindow = Math.floor(e.props.bodyColumns / shown.length) - 12
    const width = Math.max(5, Math.min(16, perWindow))

    return (
      <Box flexDirection="row" gap={3}>
        {shown.map(({ kind, percent, left, isRed }) => {
          const filled = Math.round((percent / 100) * width)
          const color = isRed ? 'error' : 'success'

          return (
            <Box key={kind} flexDirection="row">
              <Text dimColor tabular>
                {left}{' '}
              </Text>
              <Text color={color}>{'━'.repeat(filled)}</Text>
              <Text dimColor>{'─'.repeat(width - filled)}</Text>
              <Text color={color} tabular>
                {' '}
                {percent}%
              </Text>
            </Box>
          )
        })}
      </Box>
    )
  })
}
