import chalk from 'chalk'
import ora from 'ora'
import { CommandModule, Arguments } from 'yargs'
import { logger } from '../../../lib/logger'
import { SessionManager } from '../../../lib/session-manager'

interface SessionSaveArgs extends Arguments {
  name: string
  port: number
  description?: string
}

interface SessionLoadArgs extends Arguments {
  name: string
  port: number
}

interface SessionListArgs extends Arguments {
  json?: boolean
}

interface SessionDeleteArgs extends Arguments {
  name: string
  force?: boolean
}

export const sessionCommand: CommandModule = {
  command: 'session <action>',
  describe: 'Manage browser sessions (save/load/list browser state)',

  builder: yargs => {
    return yargs
      .command<SessionSaveArgs>({
        command: 'save <name>',
        describe: 'Save current browser state as a session',
        builder: yargs => {
          return yargs
            .positional('name', {
              describe: 'Session name',
              type: 'string',
              demandOption: true,
            })
            .option('port', {
              alias: 'p',
              describe: 'Browser debugging port',
              type: 'number',
              default: 9222,
            })
            .option('description', {
              alias: 'd',
              describe: 'Session description',
              type: 'string',
            })
        },
        handler: async argv => {
          const isTTY = process.stdout.isTTY && process.stderr.isTTY
          const spinner = isTTY ? ora('Saving session...').start() : null

          try {
            // Validate session name
            if (
              !argv.name ||
              argv.name.includes('/') ||
              argv.name.includes('\\')
            ) {
              throw new Error(
                'Invalid session name. Use alphanumeric characters, hyphens, and underscores only.'
              )
            }

            // Check if session already exists
            if (SessionManager.sessionExists(argv.name)) {
              const msg = chalk.yellow(
                `⚠️  Session '${argv.name}' already exists, updating...`
              )
              if (spinner) {
                spinner.info(msg)
              } else {
                console.log(msg)
              }
            }

            await SessionManager.saveSession(
              argv.name,
              argv.port,
              argv.description
            )

            const successMsg = chalk.green(`✅ Session '${argv.name}' saved successfully`)
            if (spinner) {
              spinner.succeed(successMsg)
            } else {
              console.log(successMsg)
            }

            if (argv.description) {
              logger.info(`   Description: ${argv.description}`)
            }
          } catch (error: any) {
            const errorMsg = chalk.red(`❌ Failed to save session: ${error.message}`)
            if (spinner) {
              spinner.fail(errorMsg)
            } else {
              console.error(errorMsg)
            }

            if (error.message.includes('No browser context found')) {
              logger.info('\n💡 Make sure browser is running and connected:')
              logger.info('   playwright open')
            } else if (error.message.includes('ECONNREFUSED')) {
              logger.info(
                `\n💡 No browser found on port ${argv.port}. Start browser first:`
              )
              logger.info(`   playwright open --port ${argv.port}`)
            }

            throw new Error('Command failed')
          }
        },
      })
      .command<SessionLoadArgs>({
        command: 'load <name>',
        describe: 'Load a previously saved session',
        builder: yargs => {
          return yargs
            .positional('name', {
              describe: 'Session name',
              type: 'string',
              demandOption: true,
            })
            .option('port', {
              alias: 'p',
              describe: 'Browser debugging port',
              type: 'number',
              default: 9222,
            })
        },
        handler: async argv => {
          const isTTY = process.stdout.isTTY && process.stderr.isTTY
          const spinner = isTTY ? ora('Loading session...').start() : null

          try {
            await SessionManager.loadSession(argv.name, argv.port)

            const successMsg = chalk.green(`✅ Session '${argv.name}' loaded successfully`)
            if (spinner) {
              spinner.succeed(successMsg)
            } else {
              console.log(successMsg)
            }
          } catch (error: any) {
            const errorMsg = chalk.red(`❌ Failed to load session: ${error.message}`)
            if (spinner) {
              spinner.fail(errorMsg)
            } else {
              console.error(errorMsg)
            }

            if (error.message.includes('not found')) {
              logger.info('\n💡 Available sessions:')
              const sessions = SessionManager.listSessions()
              if (sessions.length === 0) {
                logger.info('   No saved sessions')
                logger.info('   playwright session save <name>')
              } else {
                sessions.slice(0, 5).forEach(session => {
                  logger.info(
                    chalk.cyan(`   ${session.name}`) +
                      chalk.gray(
                        ` (${new Date(session.updatedAt).toLocaleDateString()})`
                      )
                  )
                })
              }
            } else if (error.message.includes('ECONNREFUSED')) {
              logger.info(
                `\n💡 No browser found on port ${argv.port}. Start browser first:`
              )
              logger.info(`   playwright open --port ${argv.port}`)
            }

            throw new Error('Command failed')
          }
        },
      })
      .command<SessionListArgs>({
        command: 'list',
        describe: 'List all saved sessions',
        builder: yargs => {
          return yargs.option('json', {
            describe: 'Output as JSON',
            type: 'boolean',
            default: false,
          })
        },
        handler: async argv => {
          try {
            const sessions = SessionManager.listSessions()

            if (argv.json) {
              logger.info(JSON.stringify(sessions, null, 2))
              return
            }

            if (sessions.length === 0) {
              logger.info('No saved sessions found.')
              logger.info('\n💡 Create a session:')
              logger.info('   playwright session save <name>')
              return
            }

            logger.info(
              chalk.bold(`\n📋 Saved Sessions (${sessions.length})\n`)
            )

            sessions.forEach((session, index) => {
              const updatedDate = new Date(session.updatedAt)
              const createdDate = new Date(session.createdAt)
              const isRecent =
                Date.now() - updatedDate.getTime() < 24 * 60 * 60 * 1000 // Within 24 hours

              logger.info(
                chalk.bold(session.name) +
                  (isRecent ? chalk.green(' (recent)') : '')
              )
              logger.info(`   URL: ${session.url}`)
              logger.info(`   Updated: ${updatedDate.toLocaleString()}`)
              if (session.metadata?.description) {
                logger.info(`   Description: ${session.metadata.description}`)
              }
              logger.info(
                `   Cookies: ${session.cookies.length}, Storage keys: ${Object.keys(session.localStorage).length + Object.keys(session.sessionStorage).length}`
              )

              if (index < sessions.length - 1) {
                console.log() // Add spacing between sessions
              }
            })

            logger.info('\n💡 Usage:')
            logger.info('   playwright session load <name>')
            logger.info('   playwright session delete <name>')
          } catch (error: any) {
            logger.commandError(`Failed to list sessions: ${error.message}`)
            throw new Error('Command failed')
          }
        },
      })
      .command<SessionDeleteArgs>({
        command: 'delete <name>',
        aliases: ['remove', 'rm'],
        describe: 'Delete a saved session',
        builder: yargs => {
          return yargs
            .positional('name', {
              describe: 'Session name',
              type: 'string',
              demandOption: true,
            })
            .option('force', {
              alias: 'f',
              describe: 'Skip confirmation prompt',
              type: 'boolean',
              default: false,
            })
        },
        handler: async argv => {
          try {
            if (!SessionManager.sessionExists(argv.name)) {
              logger.info(chalk.red(`❌ Session '${argv.name}' not found`))
              throw new Error('Command failed')
            }

            if (!argv.force) {
              // Simple confirmation without external dependency
              logger.warn(
                `⚠️  Are you sure you want to delete session '${argv.name}'?`
              )
              logger.info('   This action cannot be undone.')
              logger.info(
                '   Press Ctrl+C to cancel or run with --force to skip this prompt.'
              )

              // Wait for user input
              process.stdout.write(chalk.cyan('Delete session? (y/N): '))
              const answer = await new Promise<string>(resolve => {
                process.stdin.once('data', data => {
                  resolve(data.toString().trim().toLowerCase())
                })
              })

              if (answer !== 'y' && answer !== 'yes') {
                logger.info('Operation cancelled.')
                return
              }
            }

            await SessionManager.deleteSession(argv.name)
            logger.success(`Session '${argv.name}' deleted successfully`)
          } catch (error: any) {
            logger.commandError(`Failed to delete session: ${error.message}`)
            throw new Error('Command failed')
          }
        },
      })
      .demandCommand(
        1,
        'Please specify a session action (save, load, list, delete)'
      )
      .help().epilogue(`
Examples:
  playwright session save login-state
  playwright session save dev-env -d "Development environment with auth"
  playwright session load login-state
  playwright session list
  playwright session delete old-session --force
      `)
  },

  handler: async argv => {
    // This will be handled by the subcommands
  },
}
