// src/Modules/WebModule/WebModuleResolver.ts
import {
  Resolver,
  Query,
  FieldResolver,
  Root,
  Arg,
  InputType,
  Field,
} from 'type-graphql';
import { WebModule } from './WebModule';
import { webModuleController } from './WebModuleController';

@InputType()
class WebModuleFilter {
  @Field({ nullable: true })
  public specifier: string;

  @Field({ nullable: true })
  public filePath: string;
}

@Resolver(() => WebModule)
export class WebModuleResolver {
  @Query(() => [WebModule])
  webModules(): WebModule[] {
    return Array.from(webModuleController.modules.values());
  }

  @Query(() => WebModule, { nullable: true })
  webModule(
    @Arg('filter') { filePath, specifier }: WebModuleFilter,
  ): WebModule | undefined {
    if (filePath) {
      return webModuleController.getModule(filePath);
    } else {
      const filePath = webModuleController.specifierTest.get(specifier);

      console.log(`result for ${specifier} is filePath: ${filePath}`);

      return webModuleController.getModule(filePath!);
    }
  }

  @FieldResolver(() => [WebModule])
  dependencies(@Root() webModule: WebModule): WebModule[] {
    const deps = Array.from(webModule.dependencies);

    return deps.flatMap(
      (moduleKey) => webModuleController.getModule(moduleKey)!,
    )!;
  }

  @FieldResolver(() => String)
  specifiers(@Root() webModule: WebModule): string {
    return webModuleController.getSpecifiers(webModule.filePath);
  }

  @Query(() => Boolean)
  async helloTest(): Promise<boolean> {
    console.log(
      Array.from(webModuleController.modules),
      Array.from(webModuleController.specifierMap),
      Array.from(webModuleController.specifierTest),
    );
    return true;
  }
}
