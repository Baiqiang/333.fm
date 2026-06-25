import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum TutorialLanguage {
  EN = 'en',
  ZH_CN = 'zh-CN',
  BILINGUAL = 'bilingual',
}

@Entity()
export class Tutorials {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 255 })
  title: string

  @Column({ length: 1024 })
  url: string

  @Column({ length: 100 })
  category: string

  @Column({ type: 'enum', enum: TutorialLanguage, default: TutorialLanguage.EN })
  language: TutorialLanguage

  @Column({ default: 0 })
  sort: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
