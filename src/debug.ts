#!/usr/bin/env bun

import { logger } from './lib/logger'

logger.info(`process.argv: ${JSON.stringify(process.argv)}`)
logger.info(`argv[0]: ${process.argv[0]}`)
logger.info(`argv[1]: ${process.argv[1]}`)
logger.info(`argv[2]: ${process.argv[2]}`)
logger.info(`argv.length: ${process.argv.length}`)
logger.info(`slice(2): ${JSON.stringify(process.argv.slice(2))}`)
