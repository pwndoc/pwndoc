import { api } from 'boot/axios'

// Parses one `event: ...\ndata: ...` SSE block (as split on the blank-line separator) into
// { event, data }. Returns null for a block with no data line, which the caller skips.
const parseSseBlock = (block) => {
  let event = 'message'
  const dataLines = []

  block.split('\n').forEach((line) => {
    if (line.startsWith('event:'))
      event = line.slice(6).trim()
    else if (line.startsWith('data:'))
      dataLines.push(line.slice(5).trim())
  })

  if (!dataLines.length)
    return null

  try {
    return { event, data: JSON.parse(dataLines.join('\n')) }
  } catch (_) {
    return null
  }
}

export default {
  getEnabledFields: function(entityType) {
    return api.get('ai/enabled-fields', {
      params: { entityType }
    })
  },

  // Fetch-based (not axios) because the response is an SSE stream. Resolves once the stream
  // ends; results/errors arrive via onEvent (`heartbeat` | `done` | `error`) as parsed.
  streamGenerateFieldDraft: async function(params, { signal, onEvent } = {}) {
    const response = await fetch(`${api.defaults.baseURL}/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(params),
      signal
    })

    if (!response.ok) {
      // A proxy 502/504 means the connection died before the backend sent a structured
      // error - treat it as a timeout rather than surfacing the raw HTTP status.
      if (response.status === 502 || response.status === 504) {
        const timeoutErr = new Error(`Request failed with status ${response.status}`)
        timeoutErr.isTimeout = true
        throw timeoutErr
      }

      let message = `Request failed with status ${response.status}`
      try {
        const data = await response.json()
        message = data?.datas || message
      } catch (_) {}
      throw new Error(message)
    }

    if (!response.body)
      throw new Error('Streaming is not supported by this browser')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done)
        break

      buffer += decoder.decode(value, { stream: true })

      let separatorIndex
      while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex)
        buffer = buffer.slice(separatorIndex + 2)
        const parsed = parseSseBlock(rawEvent)
        if (parsed && onEvent)
          onEvent(parsed)
      }
    }
  },

  runAuditQa: function(auditId, params = {}) {
    return api.post('ai/qa', {
      auditId: auditId,
      ...params
    })
  },

  runVulnerabilityQa: function(params = {}) {
    return api.post('ai/vulnerabilities/qa', params)
  },

  startVulnerabilityQaRun: function(params = {}) {
    return api.post('ai/vulnerabilities/qa/run', params)
  },

  getVulnerabilityQaStatus: function(locale) {
    return api.get('ai/vulnerabilities/qa/status', {
      params: { locale }
    })
  },

  cancelVulnerabilityQaRun: function(locale) {
    return api.post('ai/vulnerabilities/qa/cancel', { locale })
  },

  setVulnerabilityQaIssueDismissed: function(params = {}) {
    return api.post('ai/vulnerabilities/qa/dismiss', params)
  },

  resolveVulnerabilityQa: function(params = {}) {
    return api.post('ai/vulnerabilities/qa/resolve', params)
  },

  testProvider: function(params = {}) {
    return api.post('ai/test', params)
  },

  // Server-side catalog discovery: the backend holds the API key and returns the
  // filtered chat-model projection for the OrcaRouter Cyber Inference selector.
  getOrcaModels: function(params = {}) {
    return api.post('ai/providers/orcarouter/models', params)
  }
}
