// src/Modules/WebAppManifest/WebAppManfiestController.ts
import { ContainerInstance, Service, Container } from 'typedi';
import { WebAppManifest, webAppManifestToken } from './WebAppManifest';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';

@Service()
export class WebAppManfiestController {
  public static async loadManifest(
    manifest: Partial<WebAppManifest>,
    container: ContainerInstance = Container.of(),
  ): Promise<WebAppManfiestController> {
    const webManifest = plainToClass(WebAppManifest, manifest);

    await validateOrReject(webManifest);

    container.set(webAppManifestToken, webManifest);

    return container.get(WebAppManfiestController);
  }
}
