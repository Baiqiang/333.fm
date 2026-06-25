import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = new DocumentBuilder()
    .setTitle('333.fm API')
    .setDescription('The 333.fm API description')
    .setVersion('1.0')
    .addTag('fmc')
    .addBearerAuth()
    .build()
  app.enableCors({
    origin: (origin, callback) => callback(null, origin),
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  )
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)
  await app.listen(process.env.FM_PORT || 3001)
}
bootstrap()
