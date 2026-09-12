/**
 * Lightweight Structured Logger for Microservices Observability
 * Output format: [ISO-Timestamp] [LEVEL] [SERVICE] [TraceId] Message {Metadata}
 */
export const createLogger = (serviceName = 'gateway') => {
  const format = (level, msg, meta = {}) => {
    const timestamp = new Date().toISOString();
    const traceId = meta.traceId || meta.requestId || 'GATEWAY';
    const metaCopy = { ...meta };
    delete metaCopy.traceId;
    delete metaCopy.requestId;
    const extra = Object.keys(metaCopy).length > 0 ? ` ${JSON.stringify(metaCopy)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${serviceName}] [${traceId}] ${msg}${extra}`;
  };

  return {
    info: (msg, meta) => console.log(format('info', msg, meta)),
    warn: (msg, meta) => console.warn(format('warn', msg, meta)),
    error: (msg, meta) => console.error(format('error', msg, meta)),
    debug: (msg, meta) => console.debug(format('debug', msg, meta))
  };
};

export default createLogger('gateway');
