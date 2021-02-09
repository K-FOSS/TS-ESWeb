// src/Modules/WebAppManifest/WebAppManifest.test.ts
import { TestSuite } from '@k-foss/ts-estests';
import { deepStrictEqual } from 'assert';
import { classToPlainFromExist, plainToClass } from 'class-transformer';
import { createFastifyTestServer } from '../../Library/Fastify';
import { logger } from '../../Library/Logger';
import '../../Utils/Setup';
import { WebAppManifest } from './WebAppManifest';
import { WebAppManfiestController } from './WebAppManifestController';

export class WebAppManifestTestSuite extends TestSuite {
  public testName = 'Web App Manifest Test Suite';

  public async test(): Promise<void> {
    const manifest: WebAppManifest = {
      name: 'HelloWorld',
      backgroundColor: '#FFFFFF',
      description: 'Hello World App1',
      display: 'standalone',
      shortName: 'Hello',
      startURL: '/Test',
      icons: [
        {
          src:
            'https://www.shareicon.net/data/512x512/2016/07/10/119930_google_512x512.png',
          type: 'image/png',
          sizes: '512x512',
        },
      ],
    };

    await WebAppManfiestController.loadManifest(manifest);

    const webServer = await createFastifyTestServer();

    console.log('Created test server?');

    const manifestRequest = await webServer.inject({
      path: '/WebManifest.json',
      method: 'GET',
    });

    deepStrictEqual(
      manifestRequest.statusCode,
      200,
      `GET Request to /WebManifest returns status code 200 with valid loaded Manifest`,
    );

    logger.debug(classToPlainFromExist(manifest, manifestRequest));

    deepStrictEqual(
      plainToClass(WebAppManifest, manifestRequest.json()),
      plainToClass(WebAppManifest, manifest),
      `GET Request to /WebManifest returns same results as loaded manifest`,
    );
  }
}
