import { Controller, Get, Query } from '@nestjs/common'

import { SearchCompetitionsDto, SearchDto, SearchScramblesDto, SearchSubmissionsDto } from './search.dto'
import { SearchService } from './search.service'

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  searchAll(@Query() dto: SearchDto) {
    return this.searchService.searchAll(dto)
  }

  @Get('submissions')
  searchSubmissions(@Query() dto: SearchSubmissionsDto) {
    return this.searchService.searchSubmissions(dto)
  }

  @Get('scrambles')
  searchScrambles(@Query() dto: SearchScramblesDto) {
    return this.searchService.searchScrambles(dto)
  }

  @Get('competitions')
  searchCompetitions(@Query() dto: SearchCompetitionsDto) {
    return this.searchService.searchCompetitions(dto)
  }
}
