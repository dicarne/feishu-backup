import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';
import { api } from './secret';


@Controller(api())
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("login")
  async login(@Query('code') code: string, @Query('state') state: string, @Res() response: Response) {
    response.redirect(api("download?code=" + code))
    return "ok"
  }

  @Get("download")
  async download(@Query('code') code: string, @Query('state') state: string, @Res() response: Response) {
    try {
      const blob = await this.appService.get_all_docs(code)
      response.setHeader('Content-Disposition', `attachment; filename=backup.zip`)
      response.setHeader('Content-Type', 'application/octet-stream')
      response.write(new Uint8Array(await blob.arrayBuffer()))
      response.status(200);
      response.send()
    } catch (error) {
      return {
        code: -1000,
        error
      }
    }
  }
}
