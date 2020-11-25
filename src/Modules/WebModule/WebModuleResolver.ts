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
  public webModules(): WebModule[] {
    return Array.from(webModuleController.modules.values());
  }

  @Query(() => WebModule, { nullable: true })
  public webModule(
    @Arg('filter') { filePath, specifier }: WebModuleFilter,
  ): WebModule | undefined {
    if (filePath) {
      return webModuleController.getModule(filePath);
    } else {
      const filePath = webModuleController.specifierTest.get(specifier);

      console.log(
        `result for ${specifier} is filePath: ${filePath?.toString() || ''}`,
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return webModuleController.getModule(filePath!);
    }
  }

  @FieldResolver(() => [WebModule])
  public dependencies(@Root() webModule: WebModule): WebModule[] {
    const deps = Array.from(webModule.dependencies);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return deps.flatMap(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (moduleKey) => webModuleController.getModule(moduleKey)!,
    )!;
  }

  @FieldResolver(() => String)
  public specifiers(@Root() webModule: WebModule): string {
    return webModuleController.getSpecifiers(webModule.filePath);
  }

  @Query(() => Boolean)
  public helloTest(): boolean {
    console.log(
      Array.from(webModuleController.modules),
      Array.from(webModuleController.specifierMap),
      Array.from(webModuleController.specifierTest),
    );
    return true;
  }
}
