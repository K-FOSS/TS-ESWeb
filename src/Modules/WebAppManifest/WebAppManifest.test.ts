// src/Modules/WebAppManifest/WebAppManifest.test.ts
import { TestSuite } from '@k-foss/ts-estests';
import { WebAppManifest } from './WebAppManifest';
import { WebAppManfiestController } from './WebAppManifestController';
import { createFastifyTestServer } from '../../Library/Fastify';
import '../../Utils/Setup';
import { deepStrictEqual } from 'assert';

export class WebAppManifestTestSuite extends TestSuite {
  public testName = 'Web App Manifest Test Suite';

  public async test(): Promise<void> {
    const manifest: WebAppManifest = {
      name: 'HelloWorld',
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

    deepStrictEqual(
      manifestRequest.json(),
      manifest,
      `GET Request to /WebManifest returns same results as loaded manifest`,
    );
  }
}
