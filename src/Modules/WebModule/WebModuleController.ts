// src/Modules/WebModule/WebModuleController.ts

import { WebModule } from './WebModule';
import { envMode } from '../../Utils/Environment';
import { BaseEventEmitter } from '../../Utils/Events';

interface WebModuleEventModule {
  filePath: string;

  webModule: WebModule;
}

interface WebModuleEventMap {
  newModule: WebModuleEventModule;

  updatedModule: string;
}

/**
 * Controller for managing WebModules
 */
class WebModuleController extends BaseEventEmitter<WebModuleEventMap> {
  public modules = new Map<string, WebModule>();
  public specifierTest = new Map<string, string>();

  public relativePathMatcher = /^\.{0,2}[/]/gm;

  /**
   * Matcher to extract submodules under /cjs/MODULE_NAME.${NODE_ENV}.js to fix issues with the CJS to ESM transformer and stuff that has an
   * entrypoint with an if block with just require
   */

  /**
   * Maps specifiers to filePaths
   */
  public specifierMap = new Map<string, Set<string>>();

  private createEventModule(filePath: string) {
    const getModule = this.getModule;

    class EventModule implements WebModuleEventModule {
      public filePath = filePath;

      get webModule(): WebModule {
        return getModule(this.filePath)!;
      }
    }

    return new EventModule();
  }

  public pushModule(filePath: string, webModule: WebModule): void {
    this.emit('newModule', this.createEventModule(filePath));

    this.createSpecifiers(filePath);

    this.modules.set(filePath, webModule);
  }

  public getModule(filePath: string): WebModule | undefined {
    return this.modules.get(filePath);
  }

  public createSpecifiers(filePath: string): void {
    let specifier: string | undefined;

    const cjsMatch = this.testCJS(filePath);
    if (cjsMatch) {
      specifier = cjsMatch;
    }

    const indexMatch = this.testIndex(filePath);
    if (indexMatch) {
      specifier = indexMatch;
    }

    if (!specifier) {
      specifier = filePath;

      const moduleSubPath = /\S+\/(node_modules)\/(?<module>(?!\/)\S+)\.((ts|js)x?)$/gm;
      const execResult = moduleSubPath.exec(specifier);

      if (execResult?.groups?.module) {
        console.log(`Setting ${execResult.groups.module} to ${filePath}`);
        this.setSpecifier(execResult.groups.module, filePath);
      }

      this.setSpecifier(specifier.replace(/\.((ts|js)x?)$/gim, ''), filePath);
    }

    this.setSpecifier(specifier, filePath);
  }

  public testCJS(filePath: string): string | undefined {
    const cjsMatcher = new RegExp(
      `(?<module>(?!/)\\S+)/cjs/(\\k<module>)-?(?<moduleSub>\\w+)?.${envMode}.js`,
      'gm',
    );

    const cjsExec = cjsMatcher.exec(filePath);

    if (cjsExec?.groups?.moduleSub) {
      return `${cjsExec?.groups?.module}/${cjsExec?.groups?.moduleSub}`;
    }

    return cjsExec?.groups?.module;
  }

  public testIndex(filePath: string): string | undefined {
    const indexMatcher = new RegExp(`(?<module>(?!/)[\\w,-]+)/index.js`, 'gm');
    const indexExec = indexMatcher.exec(filePath);

    return indexExec?.groups?.module;
  }

  public setSpecifier(specifier: string, filePath: string): void {
    // const specifierSet = this.specifierMap.get(filePath);
    // if (specifierSet) {
    //   specifierSet.add(specifier);
    // } else {
    //   this.specifierMap.set(filePath, new Set([filePath, specifier]));
    // }

    this.specifierTest.set(specifier, filePath);
  }

  public getSpecifiers(filePath: string): string {
    const helloWorld = Array.from(this.specifierTest).find(
      ([, specifierFilePath]) => specifierFilePath === filePath,
    );
    return helloWorld?.[0] || filePath;
  }
}

export const webModuleController = new WebModuleController();
