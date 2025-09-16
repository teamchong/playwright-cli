import { exec } from 'child_process'
import { promisify } from 'util'
import { CommandModule, Arguments } from 'yargs'
import { logger } from '../../../lib/logger'

const execAsync = promisify(exec)

interface InstallArgs extends Arguments {
  browser?: string
}

export const installCommand: CommandModule<{}, InstallArgs> = {
  command: 'install [browser]',
  describe: 'Install browser binaries',

  builder: yargs => {
    return yargs
      .positional('browser', {
        describe: 'Browser to install',
        type: 'string',
        default: 'chromium',
        choices: ['chromium', 'firefox', 'webkit'],
      })
      .example('$0 install', 'Install chromium (default)')
      .example('$0 install chromium', 'Install Chromium browser')
      .example('$0 install firefox', 'Install Firefox browser')
      .example('$0 install webkit', 'Install WebKit browser')
  },

  handler: async argv => {
    const browser = argv.browser || 'chromium'

    try {
      logger.info(`Installing ${browser}...`)
      const { stdout, stderr } = await execAsync(
        `npx playwright install ${browser}`
      )
      logger.info(stdout)
      if (stderr) logger.error(stderr)
      logger.success(`${browser} installed`)
      // Exit cleanly

      return
    } catch (error: any) {
      logger.commandError(`Installation failed: ${error.message}`)
      throw new Error('Command failed')
    }
  },
}
