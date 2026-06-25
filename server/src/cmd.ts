import { CommandFactory } from 'nest-commander'

import { CmdModule } from './cmd/cmd.module'

async function bootstrap() {
  await CommandFactory.run(CmdModule, ['log', 'warn', 'error'])
  process.exit(0)
}
bootstrap()
