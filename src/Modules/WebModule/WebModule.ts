// src/Modules/WebModule/WebModule.ts
import { ObjectType, Field } from 'type-graphql';

// const distDir = resolvePath('dist');
// const mapPath = resolvePath(distDir, 'moduleMap.json');

@ObjectType()
export class WebModule {
  @Field()
  public filePath: string;

  @Field()
  public code: string;

  public dependencies = new Set<string>();

  constructor(opts: Partial<WebModule> = {}) {
    Object.assign(this, opts);
  }
}

// let mapData: any;

// if (process.env.NODE_ENV === 'production') {
//   try {
//     const { promises: fs } = await import('fs');

//     const mapFile = await fs.readFile(mapPath);

//     mapData = JSON.parse(mapFile.toString());
//   } catch {}
// }

// type Specifier = string;

// export const moduleMap = new Map<Specifier, WebModule>(mapData);
