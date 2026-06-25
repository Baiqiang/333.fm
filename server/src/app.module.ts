import { BullModule } from '@nestjs/bull'
import { ClassSerializerInterceptor, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ServeStaticModule } from '@nestjs/serve-static'
import { TypeOrmModule } from '@nestjs/typeorm'
import { realpath } from 'fs/promises'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

import { AdminModule } from './admin/admin.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AttachmentModule } from './attachment/attachment.module'
import { AuthModule } from './auth/auth.module'
import { BotModule } from './bot/bot.module'
import { CommentModule } from './comment/comment.module'
import { CompetitionModule } from './competition/competition.module'
import configuration from './config/configuration'
import { DRTriggerModule } from './dr-trigger/dr-trigger.module'
import { IfModule } from './if/if.module'
import { PointModule } from './point/point.module'
import { ProfileModule } from './profile/profile.module'
import { QuizModule } from './quiz/quiz.module'
import { SearchModule } from './search/search.module'
import { StatsModule } from './stats/stats.module'
import { TutorialModule } from './tutorial/tutorial.module'
import { UserModule } from './user/user.module'
import { WcaReconstructionModule } from './wca/reconstruction/reconstruction.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: '333.fm',
      password: '',
      database: '333fm',
      synchronize: true,
      autoLoadEntities: true,
      namingStrategy: new SnakeNamingStrategy(),
      // logging: true,
    }),
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRootAsync({
      useFactory: async (configService: ConfigService) => [
        {
          rootPath: await realpath(configService.get<string>('upload.dest')),
          serveRoot: '/uploads',
        },
      ],
      inject: [ConfigService],
    }),
    IfModule,
    UserModule,
    CommentModule,
    AuthModule,
    AdminModule,
    CompetitionModule,
    DRTriggerModule,
    QuizModule,
    PointModule,
    ProfileModule,
    SearchModule,
    StatsModule,
    AttachmentModule,
    BotModule,
    TutorialModule,
    WcaReconstructionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}
