import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { Packr, PackrStream } from 'msgpackr';
import { json } from './app.data';

@Controller()
export class AppController {
  private packr = new Packr({ useRecords: true });

  @Get('json')
  getJson() {
    return json;
  }

  @Get('msgpack')
  getLargeReport(@Res({ passthrough: true }) res: Response) {
    const largeData = json;

    res.set('Content-Type', 'application/msgpack');
    res.send(Buffer.from(this.packr.pack(largeData)));
  }

  // @Get('msgpack')
  // getMsgPack(@Res() res: Response) {
  //   const stream = new PackrStream();

  //   // Set content type for MessagePack
  //   res.setHeader('Content-Type', 'application/x-msgpack');

  //   // Pipe the packing stream directly to the response
  //   stream.pipe(res);
  //   // Example data to stream
  //   const myData = this.json
  //   // Write data to the stream
  //   stream.write(myData);

  //   // End the stream
  //   stream.end();
  // }
}
